/**
 * Test backend routing for dual-language support
 * Tests that the backend correctly detects and evaluates both OpenSCAD and JavaScript
 *
 * Run with: bun run test-backend-routing.ts
 *
 * Prerequisites:
 * - Backend server must be running (bun run dev)
 * - Server must be on http://localhost:42069
 */

const API_URL = 'http://localhost:42069';

interface EvaluateResult {
  geometry: any;
  errors: any[];
  success: boolean;
  executionTime: number;
}

async function evaluateCode(code: string): Promise<EvaluateResult> {
  const response = await fetch(`${API_URL}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

async function testOpenSCADCode() {
  console.log('\n📦 Test 1: OpenSCAD Code');
  try {
    const code = `
      // Simple OpenSCAD cube
      cube(10);
    `;

    const result = await evaluateCode(code);

    if (result.success && result.geometry) {
      console.log(`  ✅ OpenSCAD evaluation successful`);
      console.log(`     - Vertices: ${result.geometry.stats.vertexCount}`);
      console.log(`     - Execution time: ${result.executionTime.toFixed(2)}ms`);
    } else {
      console.log(`  ❌ Failed:`, result.errors);
    }
  } catch (error: any) {
    console.log(`  ❌ Error:`, error.message);
  }
}

async function testJavaScriptCode() {
  console.log('\n📦 Test 2: JavaScript Code');
  try {
    const code = `
      import { Shape } from 'moicad';

      export default Shape.cube(10);
    `;

    const result = await evaluateCode(code);

    if (result.success && result.geometry) {
      console.log(`  ✅ JavaScript evaluation successful`);
      console.log(`     - Vertices: ${result.geometry.stats.vertexCount}`);
      console.log(`     - Execution time: ${result.executionTime.toFixed(2)}ms`);
    } else {
      console.log(`  ❌ Failed:`, result.errors);
    }
  } catch (error: any) {
    console.log(`  ❌ Error:`, error.message);
  }
}

async function testComplexOpenSCAD() {
  console.log('\n📦 Test 3: Complex OpenSCAD (union + difference)');
  try {
    const code = `
      difference() {
        cube([20, 20, 10]);
        translate([10, 10, 0]) sphere(8, $fn=32);
      }
    `;

    const result = await evaluateCode(code);

    if (result.success && result.geometry) {
      console.log(`  ✅ Complex OpenSCAD evaluation successful`);
      console.log(`     - Vertices: ${result.geometry.stats.vertexCount}`);
      console.log(`     - Volume: ${result.geometry.stats.volume.toFixed(2)}`);
      console.log(`     - Execution time: ${result.executionTime.toFixed(2)}ms`);
    } else {
      console.log(`  ❌ Failed:`, result.errors);
    }
  } catch (error: any) {
    console.log(`  ❌ Error:`, error.message);
  }
}

async function testComplexJavaScript() {
  console.log('\n📦 Test 4: Complex JavaScript (fluent API)');
  try {
    const code = `
      import { Shape } from 'moicad';

      const base = Shape.cube([20, 20, 10]);
      const hole = Shape.sphere(8, { $fn: 32 }).translate([10, 10, 0]);

      export default base.subtract(hole);
    `;

    const result = await evaluateCode(code);

    if (result.success && result.geometry) {
      console.log(`  ✅ Complex JavaScript evaluation successful`);
      console.log(`     - Vertices: ${result.geometry.stats.vertexCount}`);
      console.log(`     - Volume: ${result.geometry.stats.volume.toFixed(2)}`);
      console.log(`     - Execution time: ${result.executionTime.toFixed(2)}ms`);
    } else {
      console.log(`  ❌ Failed:`, result.errors);
    }
  } catch (error: any) {
    console.log(`  ❌ Error:`, error.message);
  }
}

async function testJavaScriptWithClasses() {
  console.log('\n📦 Test 5: JavaScript with Classes');
  try {
    const code = `
      import { Shape } from 'moicad';

      class Bolt {
        constructor(length, diameter) {
          this.length = length;
          this.diameter = diameter;
        }

        build() {
          const shaft = Shape.cylinder(this.length, this.diameter / 2);
          const head = Shape.cylinder(this.diameter / 2, this.diameter / 1.5, { center: true })
            .translate([0, 0, this.length]);

          return shaft.union(head);
        }
      }

      export default new Bolt(20, 6).build();
    `;

    const result = await evaluateCode(code);

    if (result.success && result.geometry) {
      console.log(`  ✅ JavaScript with classes evaluation successful`);
      console.log(`     - Vertices: ${result.geometry.stats.vertexCount}`);
      console.log(`     - Volume: ${result.geometry.stats.volume.toFixed(2)}`);
      console.log(`     - Execution time: ${result.executionTime.toFixed(2)}ms`);
    } else {
      console.log(`  ❌ Failed:`, result.errors);
    }
  } catch (error: any) {
    console.log(`  ❌ Error:`, error.message);
  }
}

async function testJavaScriptFunctionalAPI() {
  console.log('\n📦 Test 6: JavaScript Functional API');
  try {
    const code = `
      import { cube, sphere, translate, difference } from 'moicad';

      export default difference(
        cube([20, 20, 10]),
        translate([10, 10, 0], sphere(8))
      );
    `;

    const result = await evaluateCode(code);

    if (result.success && result.geometry) {
      console.log(`  ✅ Functional API evaluation successful`);
      console.log(`     - Vertices: ${result.geometry.stats.vertexCount}`);
      console.log(`     - Execution time: ${result.executionTime.toFixed(2)}ms`);
    } else {
      console.log(`  ❌ Failed:`, result.errors);
    }
  } catch (error: any) {
    console.log(`  ❌ Error:`, error.message);
  }
}

async function main() {
  console.log('🧪 Testing Backend Routing for Dual-Language Support');
  console.log('================================================\n');
  console.log('Testing against:', API_URL);

  // Check if server is running
  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) {
      console.error('❌ Backend server is not healthy. Please start it with: bun run dev');
      process.exit(1);
    }
    console.log('✅ Backend server is running\n');
  } catch (error) {
    console.error('❌ Cannot connect to backend server. Please start it with: bun run dev');
    process.exit(1);
  }

  // Run tests
  await testOpenSCADCode();
  await testJavaScriptCode();
  await testComplexOpenSCAD();
  await testComplexJavaScript();
  await testJavaScriptWithClasses();
  await testJavaScriptFunctionalAPI();

  console.log('\n✨ Backend routing tests completed!\n');
}

main().catch(console.error);
