import { Shape } from '../src/shape';
import { initManifold } from '../src/manifold/engine';
import { pluginManager, loadPlugin } from '../src/plugins';
import { initializePlugins } from '../src/functional';
import examplePlugin from './example-plugin';

/**
 * Test script demonstrating plugin system
 */
async function testPluginSystem() {
  console.log('=== Testing moicad Plugin System ===\n');

  // Initialize manifold engine first
  console.log('0. Initializing manifold engine...');
  await initManifold();
  console.log('Manifold engine initialized!\n');

  // 1. Load and register the example plugin
  console.log('1. Loading example plugin...');
  await loadPlugin(examplePlugin);
  console.log('Plugin registered successfully!\n');

  // 2. Initialize plugins (this will make plugin methods available)
  console.log('2. Initializing plugins...');
  await initializePlugins();
  await Shape.initializePlugins();
  console.log('Plugins initialized!\n');

  // 3. Test plugin primitives
  console.log('3. Testing plugin primitives...');
  
  // Test torus primitive
  const torus = (Shape as any).torus(10, 5, 24);
  console.log('Created torus with volume:', torus.getVolume().toFixed(2));
  
  // Test spring primitive
  const spring = (Shape as any).spring(50, 10, 8, 2);
  console.log('Created spring with volume:', spring.getVolume().toFixed(2));
  
  // Test gear primitive
  const gear = (Shape as any).gear(20, 12, 10);
  console.log('Created gear with volume:', gear.getVolume().toFixed(2));
  console.log();

  // 4. Test plugin transforms
  console.log('4. Testing plugin transforms...');
  
  const baseShape = Shape.cube(20);
  console.log('Base cube volume:', baseShape.getVolume().toFixed(2));
  
  // Test array transform
  const array = (baseShape as any).array(3, 2, 1, 25);
  console.log('Array (3x2) volume:', array.getVolume().toFixed(2));
  
  // Test fillet transform
  const filleted = (Shape.cube(20) as any).fillet(2);
  console.log('Filleted cube volume:', filleted.getVolume().toFixed(2));
  console.log();

  // 5. Test OpenSCAD functions
  console.log('5. Testing OpenSCAD functions...');
  const scadFunctions = pluginManager.getSCADFunctions();
  
  // Test gear calculation function
  const gearParams = scadFunctions.calc_gear_params(2, 20);
  console.log('Gear parameters:', gearParams);
  
  // Test golden ratio function
  const goldenRatio = scadFunctions.golden_ratio();
  console.log('Golden ratio:', goldenRatio);
  
  // Test fibonacci function
  const fibSequence = scadFunctions.fibonacci(10);
  console.log('Fibonacci sequence:', fibSequence);
  console.log();

  // 6. Test plugin discovery and management
  console.log('6. Testing plugin management...');
  const allPlugins = pluginManager.getAllPlugins();
  console.log('Registered plugins:', allPlugins.map(p => p.name));
  
  const enabledPlugins = allPlugins.filter(p => pluginManager.isPluginEnabled(p.name));
  console.log('Enabled plugins:', enabledPlugins.map(p => p.name));
  console.log();

  // 7. Create a complex example using multiple plugins
  console.log('7. Creating complex example...');
  
  // Create a mechanical assembly using plugin primitives
  const gear1 = (Shape as any).gear(15, 16, 8);
  const gear2 = (Shape as any).gear(10, 10, 8);
  const shaft = Shape.cylinder(20, 3);
  
  const assembly = gear1
    .union(gear2.translate([0, 0, 12]))
    .union(shaft);
  
  console.log('Complex assembly volume:', assembly.getVolume().toFixed(2));
  console.log('Assembly bounds:', assembly.getBounds());
  console.log();

  console.log('=== Plugin System Test Complete! ===');
}

// Export for use as module
export { testPluginSystem };

// Run if called directly
if (require.main === module) {
  testPluginSystem().catch(console.error);
}