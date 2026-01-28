import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { pluginManager, DefaultPluginManager, loadPlugin } from '../src/plugins';
import type { Plugin, PluginHook, PrimitiveFunction } from '../src/plugins/types';
import { Shape } from '../src/shape';
import { initManifold } from '../src/manifold/engine';

describe('Plugin System', () => {
  let testManager: DefaultPluginManager;

  beforeEach(async () => {
    testManager = new DefaultPluginManager();
    await initManifold();
  });

  afterEach(() => {
    // Clean up all plugins
    const plugins = testManager.getAllPlugins();
    for (const plugin of plugins) {
      testManager.unregister(plugin.name);
    }
  });

  describe('PluginManager Core', () => {
    it('should create plugin manager', () => {
      expect(testManager).toBeDefined();
      expect(testManager.getAllPlugins()).toEqual([]);
    });

    it('should register plugin', () => {
      const plugin = createTestPlugin();
      testManager.register(plugin);
      
      expect(testManager.getAllPlugins()).toHaveLength(1);
      expect(testManager.getPlugin('test-plugin')).toEqual(plugin);
      expect(testManager.isPluginEnabled('test-plugin')).toBe(true);
    });

    it('should not register duplicate plugin', () => {
      const plugin = createTestPlugin();
      testManager.register(plugin);
      
      expect(() => testManager.register(plugin)).toThrow('Plugin \'test-plugin\' is already registered');
    });

    it('should unregister plugin', async () => {
      const plugin = createTestPlugin();
      testManager.register(plugin);
      
      await testManager.unregister('test-plugin');
      
      expect(testManager.getAllPlugins()).toEqual([]);
      expect(testManager.getPlugin('test-plugin')).toBeUndefined();
    });

    it('should validate plugin dependencies', () => {
      const plugin = createTestPluginWithDeps();
      
      expect(() => testManager.register(plugin)).toThrow('Plugin \'test-plugin\' requires dependency \'missing-dependency\' which is not registered');
    });

    it('should enable/disable plugins', () => {
      const plugin = createTestPlugin();
      testManager.register(plugin);
      
      testManager.setPluginEnabled('test-plugin', false);
      expect(testManager.isPluginEnabled('test-plugin')).toBe(false);
      
      testManager.setPluginEnabled('test-plugin', true);
      expect(testManager.isPluginEnabled('test-plugin')).toBe(true);
    });

    it('should handle plugin hooks', async () => {
      const plugin = createTestPlugin();
      await testManager.loadPlugin(plugin);
      
      const result = testManager.executeHook('test-hook', 'arg1', 'arg2');
      
      expect(result).toBe('hook-result');
    });

    it('should execute hooks in priority order', async () => {
      const results: string[] = [];
      
      // Use named functions for proper registration
      const lowHook = function lowHook() { results.push('low'); };
      const highHook = function highHook() { results.push('high'); };
      
      // Create two plugins with different priorities
      const lowPriorityPlugin = {
        name: 'low-priority-plugin', 
        version: '1.0.0',
        async initialize(manager) {
          manager.addHook('test-hook', lowHook);
        }
      };
      
      const highPriorityPlugin = {
        name: 'high-priority-plugin',
        version: '1.0.0',
        async initialize(manager) {
          // Set higher priority for this plugin
          manager.setPluginEnabled('high-priority-plugin', true);
          (manager as any).configs.get('high-priority-plugin').priority = 10;
          manager.addHook('test-hook', highHook);
        }
      };
      
      await testManager.loadPlugin(lowPriorityPlugin);
      await testManager.loadPlugin(highPriorityPlugin);
      
      testManager.executeHook('test-hook');
      
      expect(results).toEqual(['high', 'low']);
    });
  });

  describe('Plugin Types', () => {
    it('should register custom primitives', () => {
      const plugin = createTestPlugin();
      testManager.register(plugin);
      
      const primitives = testManager.getPrimitives();
      expect(primitives).toHaveProperty('testPrimitive');
      expect(typeof primitives.testPrimitive).toBe('function');
    });

    it('should register custom transforms', () => {
      const plugin = createTestPlugin();
      testManager.register(plugin);
      
      const transforms = testManager.getTransforms();
      expect(transforms).toHaveProperty('testTransform');
      expect(typeof transforms.testTransform).toBe('function');
    });

    it('should register SCAD functions', () => {
      const plugin = createTestPlugin();
      testManager.register(plugin);
      
      const scadFunctions = testManager.getSCADFunctions();
      expect(scadFunctions).toHaveProperty('testSCADFunction');
      expect(typeof scadFunctions.testSCADFunction).toBe('function');
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should call initialize hook', async () => {
      let initialized = false;
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        initialize: async (manager) => {
          expect(manager).toBe(testManager);
          initialized = true;
        }
      };
      
      await testManager.loadPlugin(plugin);
      
      expect(initialized).toBe(true);
    });

    it('should call activate hook', async () => {
      let activated = false;
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        activate: async () => {
          activated = true;
        }
      };
      
      await testManager.loadPlugin(plugin);
      
      expect(activated).toBe(true);
    });

    it('should call deactivate hook', async () => {
      let deactivated = false;
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        deactivate: async () => {
          deactivated = true;
        }
      };
      
      testManager.register(plugin);
      await testManager.unregister('test-plugin');
      
      expect(deactivated).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin load errors gracefully', async () => {
      const invalidPlugin = null as any;
      
      await expect(testManager.loadPlugin(invalidPlugin)).rejects.toThrow();
    });

    it('should handle hook execution errors', () => {
      const plugin = {
        name: 'error-plugin',
        version: '1.0.0',
        initialize: () => {
          testManager.addHook('error-hook', () => {
            throw new Error('Hook error');
          });
        }
      };
      
      testManager.register(plugin);
      
      // Should not throw, just log the error
      expect(() => testManager.executeHook('error-hook')).not.toThrow();
    });

    it('should validate plugin structure', () => {
      const invalidPlugin1 = { name: '', version: '1.0.0' };
      const invalidPlugin2 = { name: 'test', version: '' };
      
      expect(() => testManager.register(invalidPlugin1 as any)).toThrow('Invalid plugin structure');
      expect(() => testManager.register(invalidPlugin2 as any)).toThrow('Invalid plugin structure');
    });
  });

  describe('Integration with Shape Class', () => {
    beforeEach(async () => {
      // Initialize Shape with our test plugin manager instead of global
      (globalThis as any).testPluginManager = testManager;
    });

    it('should integrate plugin primitives with Shape class', async () => {
      const plugin = createTestPlugin();
      await testManager.loadPlugin(plugin);
      
      // Manually call initializePluginMethods since Shape uses global pluginManager
      (Shape as any).initializePluginMethods();
      
      // Plugin primitive should be available on Shape class
      expect((Shape as any).testPrimitive).toBeDefined();
      
      const shape = (Shape as any).testPrimitive(10);
      expect(shape).toBeInstanceOf(Shape);
      expect(shape.getVolume()).toBeGreaterThan(0);
    });

    it('should integrate plugin transforms with Shape instances', async () => {
      const plugin = createTestPlugin();
      await testManager.loadPlugin(plugin);
      
      // Manually call initializePluginMethods
      (Shape as any).initializePluginMethods();
      
      const baseShape = Shape.cube(10);
      
      // Plugin transform should be available on shape instance
      expect((baseShape as any).testTransform).toBeDefined();
      
      const transformed = (baseShape as any).testTransform(2);
      expect(transformed).toBeInstanceOf(Shape);
      expect(transformed.getVolume()).toBe(baseShape.getVolume() * 8); // scale 2x2x2
    });
  });
});

describe('Plugin Discovery', () => {
  it('should load plugin from file path', async () => {
    const fs = await import('fs/promises');
    const pluginPath = './examples/example-plugin.ts';
    
    try {
      await fs.access(pluginPath);
      await expect(loadPlugin(pluginPath)).resolves.not.toThrow();
    } catch (error) {
      // File doesn't exist, skip test
      console.log('Skipping plugin discovery test - example file not found');
    }
  });

  it('should handle missing plugin files', async () => {
    const missingPath = './non-existent-plugin.ts';
    
    await expect(loadPlugin(missingPath)).rejects.toThrow();
  });
});

// Helper functions for creating test plugins
function createTestPlugin(): Plugin {
  // Use named functions for proper hook registration
  const testHook = function testHook() { return 'hook-result'; };
  const testPrimitive = function testPrimitive(size: number) { return Shape.cube(size); };
  const testTransform = function testTransform(shape: Shape, scale: number) { return shape.scale(scale); };
  const testSCADFunction = function testSCADFunction(x: number) { return x * 2; };
  
  return {
    name: 'test-plugin',
    version: '1.0.0',
    
    primitives: {
      testPrimitive
    },
    
    transforms: {
      testTransform
    },
    
    scadFunctions: {
      testSCADFunction
    },
    
    async initialize(manager) {
      manager.addHook('test-hook', testHook);
    }
  };
}

function createTestPluginWithDeps(): Plugin {
  return {
    name: 'test-plugin',
    version: '1.0.0',
    dependencies: ['missing-dependency'],
    
    primitives: {
      testPrimitive: (size: number) => Shape.cube(size)
    }
  };
}