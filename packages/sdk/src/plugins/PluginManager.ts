import type { 
  Plugin, 
  PluginManager, 
  PluginConfig, 
  PluginHook, 
  HookName,
  PrimitiveFunction,
  TransformFunction,
  FileHandler,
  SCADFunction,
  ViewportExtension
} from './types';

export class DefaultPluginManager implements PluginManager {
  private plugins = new Map<string, Plugin>();
  private configs = new Map<string, PluginConfig>();
  private hooks = new Map<string, PluginHook[]>();
  private enabledPlugins = new Set<string>();

  register(plugin: Plugin): void {
    if (!this.isValidPlugin(plugin)) {
      throw new Error(`Invalid plugin structure`);
    }

    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    // Validate dependencies
    this.validateDependencies(plugin);

    // Set default config
    if (!this.configs.has(plugin.name)) {
      this.configs.set(plugin.name, {
        enabled: true,
        priority: 0,
        settings: {}
      });
    }

    this.plugins.set(plugin.name, plugin);
    this.executeHook('plugin.register', plugin);

    // Auto-enable if config says so
    const config = this.configs.get(plugin.name)!;
    if (config.enabled) {
      this.setPluginEnabled(plugin.name, true);
    }
  }

  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' is not registered`);
    }

    // Deactivate first
    if (this.isPluginEnabled(name)) {
      this.setPluginEnabled(name, false);
    }

    // Call cleanup
    if (plugin.deactivate) {
      await plugin.deactivate();
    }

    this.plugins.delete(name);
    this.configs.delete(name);
    this.executeHook('plugin.unregister', plugin);
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  executeHook<T>(hookName: string, ...args: any[]): T | undefined {
    const hooks = this.hooks.get(hookName) || [];
    const enabledHooks = hooks.filter(hook => {
      const plugin = this.plugins.get(hook.name);
      return plugin && this.isPluginEnabled(hook.name);
    });

    // Sort by priority (higher priority first)
    enabledHooks.sort((a, b) => b.priority - a.priority);

    let result: T | undefined;
    for (const hook of enabledHooks) {
      try {
        const hookResult = hook.callback(...args);
        if (hookResult !== undefined) {
          result = hookResult;
        }
      } catch (error) {
        console.error(`Error in hook '${hookName}' from plugin '${hook.name}':`, error);
      }
    }

    return result;
  }

  addHook(hookName: string, callback: Function): void {
    // Extract plugin name from callback function name or use default
    const pluginName = this.extractPluginName(callback);
    
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    // Get priority from config or default to 0 if no config exists
    let priority = 0;
    if (pluginName !== 'unknown') {
      const config = this.configs.get(pluginName);
      if (config) {
        priority = config.priority;
      } else {
        // Create default config if none exists
        this.configs.set(pluginName, {
          enabled: true,
          priority: 0,
          settings: {}
        });
      }
    }

    this.hooks.get(hookName)!.push({
      name: pluginName,
      priority,
      callback
    });
  }

  removeHook(hookName: string, callback: Function): void {
    const hooks = this.hooks.get(hookName);
    if (!hooks) return;

    const index = hooks.findIndex(hook => hook.callback === callback);
    if (index !== -1) {
      hooks.splice(index, 1);
    }
  }

  async loadPlugin(plugin: Plugin): Promise<void> {
    this.register(plugin);
    
    if (plugin.initialize) {
      await plugin.initialize(this);
    }

    if (this.isPluginEnabled(plugin.name) && plugin.activate) {
      await plugin.activate();
    }
  }

  async loadPluginFromPath(path: string): Promise<void> {
    try {
      const module = await import(path);
      const plugin = module.default || module.plugin || module;
      
      if (!this.isValidPlugin(plugin)) {
        throw new Error(`Invalid plugin at path: ${path}`);
      }

      await this.loadPlugin(plugin);
    } catch (error) {
      throw new Error(`Failed to load plugin from path '${path}': ${error}`);
    }
  }

  async loadPluginFromNpm(packageName: string): Promise<void> {
    try {
      const module = await import(packageName);
      const plugin = module.default || module.plugin || module;
      
      if (!this.isValidPlugin(plugin)) {
        throw new Error(`Invalid plugin package: ${packageName}`);
      }

      await this.loadPlugin(plugin);
    } catch (error) {
      throw new Error(`Failed to load plugin from npm package '${packageName}': ${error}`);
    }
  }

  isPluginEnabled(name: string): boolean {
    return this.enabledPlugins.has(name);
  }

  setPluginEnabled(name: string, enabled: boolean): void {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' is not registered`);
    }

    const config = this.configs.get(name)!;
    config.enabled = enabled;

    if (enabled && !this.isPluginEnabled(name)) {
      this.enabledPlugins.add(name);
      if (plugin.activate) {
        Promise.resolve(plugin.activate()).catch((error: any) => {
          console.error(`Error activating plugin '${name}':`, error);
        });
      }
    } else if (!enabled && this.isPluginEnabled(name)) {
      this.enabledPlugins.delete(name);
      if (plugin.deactivate) {
        Promise.resolve(plugin.deactivate()).catch((error: any) => {
          console.error(`Error deactivating plugin '${name}':`, error);
        });
      }
    }
  }

  // Plugin convenience methods
  getPrimitives(): Record<string, PrimitiveFunction> {
    const primitives: Record<string, PrimitiveFunction> = {};
    
    for (const plugin of this.getAllPlugins()) {
      if (!this.isPluginEnabled(plugin.name) || !plugin.primitives) continue;
      
      Object.assign(primitives, plugin.primitives);
    }
    
    return primitives;
  }

  getTransforms(): Record<string, TransformFunction> {
    const transforms: Record<string, TransformFunction> = {};
    
    for (const plugin of this.getAllPlugins()) {
      if (!this.isPluginEnabled(plugin.name) || !plugin.transforms) continue;
      
      Object.assign(transforms, plugin.transforms);
    }
    
    return transforms;
  }

  getFileHandlers(): FileHandler[] {
    const handlers: FileHandler[] = [];
    
    for (const plugin of this.getAllPlugins()) {
      if (!this.isPluginEnabled(plugin.name) || !plugin.fileHandlers) continue;
      
      handlers.push(...plugin.fileHandlers);
    }
    
    return handlers;
  }

  getSCADFunctions(): Record<string, SCADFunction> {
    const functions: Record<string, SCADFunction> = {};
    
    for (const plugin of this.getAllPlugins()) {
      if (!this.isPluginEnabled(plugin.name) || !plugin.scadFunctions) continue;
      
      Object.assign(functions, plugin.scadFunctions);
    }
    
    return functions;
  }

  getViewportExtensions(): ViewportExtension[] {
    const extensions: ViewportExtension[] = [];
    
    for (const plugin of this.getAllPlugins()) {
      if (!this.isPluginEnabled(plugin.name) || !plugin.viewportExtensions) continue;
      
      extensions.push(...plugin.viewportExtensions);
    }
    
    return extensions;
  }

  private validateDependencies(plugin: Plugin): void {
    if (!plugin.dependencies) return;

    for (const dependency of plugin.dependencies) {
      if (!this.plugins.has(dependency)) {
        throw new Error(`Plugin '${plugin.name}' requires dependency '${dependency}' which is not registered`);
      }
    }
  }

  private isValidPlugin(obj: any): obj is Plugin {
    return obj && 
           typeof obj.name === 'string' && 
           typeof obj.version === 'string' &&
           obj.name.length > 0 &&
           obj.version.length > 0;
  }

  private extractPluginName(callback: Function): string {
    // Try to get plugin name from function name
    if (callback.name) {
      const match = callback.name.match(/^(\w+)/);
      if (match) return match[1];
    }

    // Fallback to searching for plugin that owns this callback
    for (const [name, plugin] of this.plugins) {
      if (Object.values(plugin).includes(callback)) {
        return name;
      }
    }

    return 'unknown';
  }
}

// Global plugin manager instance
export const pluginManager = new DefaultPluginManager();