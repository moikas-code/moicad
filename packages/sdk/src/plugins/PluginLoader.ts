import type { PluginManager, Plugin } from './types';
import { pluginManager } from './PluginManager';

export class PluginDiscovery {
  private manager: PluginManager;
  private searchPaths: string[] = [];

  constructor(manager: PluginManager = pluginManager) {
    this.manager = manager;
  }

  addSearchPath(path: string): void {
    this.searchPaths.push(path);
  }

  async discoverPlugins(): Promise<string[]> {
    const pluginPaths: string[] = [];

    // Search configured paths
    for (const path of this.searchPaths) {
      const plugins = await this.searchDirectory(path);
      pluginPaths.push(...plugins);
    }

    // Search npm packages with naming conventions
    const npmPlugins = await this.searchNpmPackages();
    pluginPaths.push(...npmPlugins);

    return pluginPaths;
  }

  async loadDiscoveredPlugins(): Promise<void> {
    const pluginPaths = await this.discoverPlugins();
    
    for (const path of pluginPaths) {
      try {
        await this.manager.loadPluginFromPath(path);
      } catch (error) {
        console.warn(`Failed to load plugin from '${path}':`, error);
      }
    }
  }

  private async searchDirectory(dirPath: string): Promise<string[]> {
    const plugins: string[] = [];
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dirPath, entry.name);
          const packageJsonPath = path.join(fullPath, 'package.json');
          
          try {
            await fs.access(packageJsonPath);
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            
            if (this.isMoicadPlugin(packageJson)) {
              const mainFile = packageJson.main || packageJson.module || 'index.js';
              const mainPath = path.join(fullPath, mainFile);
              plugins.push(mainPath);
            }
          } catch {
            // Not a package or invalid package.json, skip
          }
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
          // Direct JavaScript/TypeScript plugin files
          plugins.push(path.join(dirPath, entry.name));
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return plugins;
  }

  private async searchNpmPackages(): Promise<string[]> {
    const plugins: string[] = [];
    
    try {
      const packageJsonPath = './package.json';
      const fs = await import('fs/promises');
      
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const dependencies = { 
          ...packageJson.dependencies, 
          ...packageJson.devDependencies 
        };
        
        for (const packageName of Object.keys(dependencies)) {
          if (this.isMoicadPluginPackage(packageName)) {
            plugins.push(packageName);
          }
        }
      } catch {
        // No package.json found
      }
    } catch (error) {
      // FS module not available (browser environment)
    }
    
    return plugins;
  }

  private isMoicadPlugin(packageJson: any): boolean {
    if (!packageJson) return false;
    
    // Check for moicad plugin keywords
    const keywords = packageJson.keywords || [];
    const hasPluginKeyword = keywords.some((k: string) => 
      k.toLowerCase().includes('moicad') || 
      k.toLowerCase().includes('plugin')
    );
    
    // Check for moicad plugin in name
    const hasPluginName = packageJson.name && (
      packageJson.name.includes('@moicad/plugin-') ||
      packageJson.name.includes('moicad-plugin-') ||
      packageJson.name.includes('-moicad-plugin')
    );
    
    return hasPluginKeyword || hasPluginName;
  }

  private isMoicadPluginPackage(packageName: string): boolean {
    return packageName.startsWith('@moicad/plugin-') ||
           packageName.startsWith('moicad-plugin-') ||
           packageName.includes('-moicad-plugin');
  }
}

export class PluginLoader {
  private manager: PluginManager;
  private discovery: PluginDiscovery;

  constructor(manager: PluginManager = pluginManager) {
    this.manager = manager;
    this.discovery = new PluginDiscovery(manager);
  }

  async initialize(): Promise<void> {
    // Add default search paths
    this.discovery.addSearchPath('./plugins');
    this.discovery.addSearchPath('./node_modules/@moicad');
    
    // Load discovered plugins
    await this.discovery.loadDiscoveredPlugins();
  }

  async loadPlugin(source: string | object): Promise<void> {
    if (typeof source === 'string') {
      if (source.startsWith('./') || source.startsWith('/')) {
        // File path
        await this.manager.loadPluginFromPath(source);
      } else if (source.includes('/')) {
        // NPM package
        await this.manager.loadPluginFromNpm(source);
      } else {
        // Try as path first, then npm
        try {
          await this.manager.loadPluginFromPath(source);
        } catch {
          await this.manager.loadPluginFromNpm(source);
        }
      }
    } else if (typeof source === 'object') {
      // Direct plugin object
      await this.manager.loadPlugin(source as Plugin);
    } else {
      throw new Error(`Invalid plugin source: ${typeof source}`);
    }
  }

  getDiscovery(): PluginDiscovery {
    return this.discovery;
  }
}

// Convenience functions
export async function loadPlugin(source: string | object): Promise<void> {
  const loader = new PluginLoader();
  await loader.loadPlugin(source);
}

export async function initializePlugins(): Promise<void> {
  const loader = new PluginLoader();
  await loader.initialize();
}