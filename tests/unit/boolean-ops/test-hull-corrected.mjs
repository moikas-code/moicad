import { parseOpenSCAD } from './backend/scad-parser.ts';
import { evaluateAST, initWasm } from './backend/scad-evaluator.ts';
import * as wasmModule from './wasm/pkg/moicad_wasm.js';

interface TestResult {
  name: string;
  code: string;
  success: boolean;
  parseErrors: string[];
  evaluationErrors: string[];
  hasGeometry: boolean;
  executionTime?: number;
  notes?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
}

class ComprehensiveValidator {
  private results: TestSuite[] = [];
  private wasmInitialized = false;

  async initialize(): Promise<void> {
    try {
      await initWasm(wasmModule);
      this.wasmInitialized = true;
      console.log('✅ WASM module initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WASM module:', error);
      throw error;
    }
  }

  private async runTest(name: string, code: string): Promise<TestResult> {
    const startTime = performance.now();
    
    // Parse
    const parseResult = parseOpenSCAD(code);
    
    // Evaluate if parsing succeeded
    let evalResult = null;
    if (parseResult.success && this.wasmInitialized) {
      evalResult = await evaluateAST(parseResult.ast!);
    }
    
    const executionTime = performance.now() - startTime;

    return {
      name,
      code,
      success: parseResult.success && (evalResult?.success ?? false),
      parseErrors: parseResult.errors.map(e => e.message),
      evaluationErrors: evalResult?.errors.map(e => e.message) ?? [],
      hasGeometry: !!evalResult?.geometry,
      executionTime,
      notes: ''
    };
  }

  async runCorePrimitivesTests(): Promise<TestSuite> {
    const tests = [
      // Basic primitives
      {
        name: 'cube() - default size',
        code: 'cube(10);'
      },
      {
        name: 'cube() - named parameter',
        code: 'cube(size=5);'
      },
      {
        name: 'sphere() - radius parameter',
        code: 'sphere(r=5);'
      },
      {
        name: 'sphere() - diameter parameter',
        code: 'sphere(d=10);'
      },
      {
        name: 'sphere() - with $fn detail',
        code: 'sphere(r=5, $fn=32);'
      },
      {
        name: 'cylinder() - basic',
        code: 'cylinder(h=10, r=5);'
      },
      {
        name: 'cylinder() - with r1/r2',
        code: 'cylinder(h=10, r1=3, r2=7);'
      },
      {
        name: 'cylinder() - positional parameters',
        code: 'cylinder(10, 5);'
      },
      {
        name: 'cone() - basic',
        code: 'cone(h=15, r=6);'
      },
      {
        name: 'circle() - basic',
        code: 'circle(r=8);'
      },
      {
        name: 'circle() - with diameter',
        code: 'circle(d=16);'
      },
      {
        name: 'square() - basic',
        code: 'square(size=12);'
      },
      {
        name: 'polygon() - triangle',
        code: 'polygon(points=[[0,0], [10,0], [5,8]]);'
      },
      {
        name: 'polygon() - complex shape',
        code: 'polygon(points=[[0,0], [10,0], [10,5], [5,8], [0,5]]);'
      },
      {
        name: 'polyhedron() - tetrahedron',
        code: 'polyhedron(points=[[0,0,0], [10,0,0], [5,8,0], [5,4,6]], faces=[[0,1,2], [0,1,3], [1,2,3], [0,2,3]]);'
      }
    ];

    const results: TestResult[] = [];
    for (const test of tests) {
      const result = await this.runTest(test.name, test.code);
      results.push(result);
    }

    return {
      name: 'Core Primitives',
      tests: results,
      summary: this.calculateSummary(results)
    };
  }

  async runTransformationsTests(): Promise<TestSuite> {
    const tests = [
      // Basic transforms
      {
        name: 'variable expression',
        code: 'radius = 5; diameter = radius * 2; cylinder(diameter, 10);'
      },
      // Functions
      {
        name: 'function definition and call',
        code: 'function double(x) = x * 2; size = double(5); cube(size);'
      },
      {
        name: 'function multiple parameters',
        code: 'function area(w, h) = w * h; cube([area(3, 4), area(2, 5), 10]);'
      },
      {
        name: 'function with math',
        code: 'function distance(x, y) = sqrt(x*x + y*y); r = distance(3, 4); sphere(r);'
      },
      // Modules
      {
        name: 'module definition and call',
        code: 'module box(w, h, d) { cube([w, h, d]); } box(10, 20, 5);'
      },
      {
        name: 'module with transforms',
        code: 'module positioned_cube(s, pos) { translate(pos) cube(s); } positioned_cube(8, [5, 10, 2]);'
      },
      {
        name: 'module with children',
        code: 'module frame(size) { difference() { cube(size); translate([2,2,2]) cube([size[0]-4, size[1]-4, size[2]-4]); } } frame([20, 20, 5]);'
      },
      // Conditionals
      {
        name: 'if statement - true branch',
        code: 'enable = true; if (enable) { cube(10); } else { sphere(5); }'
      },
      {
        name: 'if statement - false branch',
        code: 'enable = false; if (enable) { cube(10); } else { sphere(5); }'
      },
      {
        name: 'if without else',
        code: 'condition = 5 > 3; if (condition) { cylinder(10, 4); }'
      },
      // For loops
      {
        name: 'for loop - simple range',
        code: 'for (i = [0:4]) { translate([i*10, 0, 0]) cube(5); }'
      },
      {
        name: 'for loop - with step',
        code: 'for (i = [0:10:2]) { translate([i, 0, 0]) sphere(2); }'
      },
      {
        name: 'for loop - negative step',
        code: 'for (i = [10:-2:0]) { translate([i, 10, 0]) cube(3); }'
      },
      // Let statements
      {
        name: 'let statement - single binding',
        code: 'let(x = 10) { cube(x); }'
      },
      {
        name: 'let statement - multiple bindings',
        code: 'let(width = 15, height = 8) { cube([width, height, 5]); }'
      },
      {
        name: 'let with expression',
        code: 'let(radius = 5, diameter = radius * 2) { cylinder(10, diameter/2); }'
      }
    ];

    const results: TestResult[] = [];
    for (const test of tests) {
      const result = await this.runTest(test.name, test.code);
      results.push(result);
    }

    return {
      name: 'Language Features',
      tests: results,
      summary: this.calculateSummary(results)
    };
  }

  async runAdvancedFeaturesTests(): Promise<TestSuite> {
    const tests = [
      // Text primitive (if implemented)
      {
        name: 'text() - basic',
        code: 'text("Hello", size=10);',
        note: 'May not be implemented yet'
      },
      // Color operator (if implemented)
      {
        name: 'color() - red',
        code: 'color("red") cube(10);',
        note: 'May not be implemented yet'
      },
      {
        name: 'color() - RGB',
        code: 'color([1, 0, 0]) sphere(5);',
        note: 'May not be implemented yet'
      },
      // Visualization modifiers
      {
        name: 'debug modifier (#)',
        code: '#translate([10, 0, 0]) cube(8);'
      },
      {
        name: 'transparent modifier (%)',
        code: '%translate([0, 10, 0]) sphere(6);'
      },
      {
        name: 'disable modifier (*)',
        code: 'translate([0, 0, 10]) { *cube(5); sphere(8); }'
      },
      {
        name: 'root modifier (!)',
        code: '!translate([10, 10, 0]) cylinder(10, 5); sphere(3);'
      },
      {
        name: 'multiple modifiers',
        code: 'union() { #translate([0, 0, 0]) cube(8); %translate([10, 0, 0]) sphere(4); }'
      },
      // Echo and assert
      {
        name: 'echo() statement',
        code: 'size = 10; echo("Size is:", size); cube(size);'
      },
      {
        name: 'assert() - passing',
        code: 'assert(5 > 3, "Math works") cube(8);'
      },
      {
        name: 'assert() - failing',
        code: 'assert(5 > 10, "This should fail") cube(8);'
      }
    ];

    const results: TestResult[] = [];
    for (const test of tests) {
      const result = await this.runTest(test.name, test.code);
      result.notes = test.note || '';
      results.push(result);
    }

    return {
      name: 'Advanced Features',
      tests: results,
      summary: this.calculateSummary(results)
    };
  }

  async runSpecialVariablesTests(): Promise<TestSuite> {
    const tests = [
      // $fn (fragment number)
      {
        name: '$fn global variable',
        code: '$fn = 32; sphere(10);'
      },
      {
        name: '$fn in primitive',
        code: 'sphere(5, $fn=16);'
      },
      {
        name: '$fn override',
        code: '$fn = 8; sphere(5, $fn=24);'
      },
      // $fa (fragment angle)
      {
        name: '$fa fragment angle',
        code: '$fa = 5; sphere(10);'
      },
      {
        name: '$fa combined with $fn',
        code: '$fa = 10; $fn = 12; sphere(8);'
      },
      // $fs (fragment size)
      {
        name: '$fs fragment size',
        code: '$fs = 1; sphere(10);'
      },
      {
        name: '$fs with $fa',
        code: '$fa = 15; $fs = 0.5; sphere(12);'
      },
      // $t (animation time)
      {
        name: '$t animation time',
        code: 'translate([$t*20, 0, 0]) cube(5);'
      },
      {
        name: '$t with rotation',
        code: 'rotate($t*360) cylinder(10, 3);'
      },
      {
        name: '$t in conditional',
        code: 'if ($t < 0.5) { cube(8); } else { sphere(5); }'
      },
      // Viewport special variables tests
      {
        name: '$vpr default rotation',
        code: 'rotate($vpr) cube(5);'
      },
      {
        name: '$vpr custom rotation',
        code: '$vpr = [45, 30, 60]; rotate($vpr) sphere(5);'
      },
      {
        name: '$vpt translation',
        code: 'translate($vpt) cube(5);'
      },
      {
        name: '$vpt custom translation',
        code: '$vpt = [10, 20, 30]; translate($vpt) sphere(5);'
      },
      {
        name: '$vpd custom distance',
        code: '$vpd = 200; cube(5);'
      },
      {
        name: '$vpf custom field of view',
        code: '$vpf = 90; cube(5);'
      },
      {
        name: '$preview default behavior',
        code: 'if ($preview) { cube(5); } else { sphere(5); }'
      },
      {
        name: '$preview override',
        code: '$preview = false; if ($preview) { cube(5); } else { sphere(5); }'
      },
      {
        name: 'multiple viewport variables',
        code: '$vpr = [30, 45, 0]; $vpt = [5, 10, 15]; rotate($vpr) translate($vpt) cube(5);'
      }
    ];

    const results: TestResult[] = [];
    for (const test of tests) {
      const result = await this.runTest(test.name, test.code);
      results.push(result);
    }

    return {
      name: 'Special Variables',
      tests: results,
      summary: this.calculateSummary(results)
    };
  }

  async runComplexCombinationsTests(): Promise<TestSuite> {
    const tests = [
      // Complex nested structures
      {
        name: 'nested modules with transforms',
        code: `
module wheel(r) {
  cylinder(3, r, r);
}

module car() {
  // Body
  cube([30, 15, 8]);
  // Wheels
  translate([5, -3, 0]) wheel(3);
  translate([25, -3, 0]) wheel(3);
  translate([5, 18, 0]) wheel(3);
  translate([25, 18, 0]) wheel(3);
}

car();
        `
      },
      {
        name: 'parametric design with functions',
        code: `
function gear_radius(teeth, module) = teeth * module / 2;

module gear(teeth, module, height) {
  r = gear_radius(teeth, module);
  cylinder(height, r, r);
}

gear(20, 2, 5);
        `
      },
      {
        name: 'for loop with complex geometry',
        code: `
for (angle = [0:30:330]) {
  rotate(angle) {
    translate([10, 0, 0]) {
      cube([5, 2, 8], center=true);
    }
  }
}
        `
      },
      {
        name: 'conditional geometry generation',
        code: `
has_hole = true;
size = 20;

difference() {
  cube(size);
  if (has_hole) {
    translate([size/2, size/2, -1]) {
      cylinder(size+2, 3);
    }
  }
}
        `
      },
      {
        name: 'list comprehensions',
        code: `
points = [for (i = [0:4]) [i*5, sin(i*45)*10, 0]];
for (p = points) {
  translate(p) sphere(2);
}
        `
      },
      {
        name: 'recursive module pattern',
        code: `
module branch(length, depth) {
  if (depth > 0) {
    cube([length, 2, 2]);
    translate([length, 0, 0]) {
      rotate(30) {
        branch(length * 0.7, depth - 1);
      }
    }
  }
}

branch(10, 4);
        `
      }
    ];

    const results: TestResult[] = [];
    for (const test of tests) {
      const result = await this.runTest(test.name, test.code);
      results.push(result);
    }

    return {
      name: 'Complex Combinations',
      tests: results,
      summary: this.calculateSummary(results)
    };
  }

  async runErrorHandlingTests(): Promise<TestSuite> {
    const tests = [
      // Syntax errors
      {
        name: 'missing semicolon',
        code: 'cube(10) sphere(5);',
        note: 'Should parse but might not evaluate correctly'
      },
      {
        name: 'unmatched braces',
        code: 'union() { cube(10);',
        note: 'Should fail parsing'
      },
      {
        name: 'invalid function name',
        code: 'unknown_function(10);',
        note: 'Should fail evaluation'
      },
      {
        name: 'wrong parameter types',
        code: 'cube("not a number");',
        note: 'Should handle gracefully'
      },
      {
        name: 'division by zero',
        code: 'size = 10 / 0; cube(size);',
        note: 'Should handle mathematically'
      },
      {
        name: 'negative geometry size',
        code: 'cube(-5);',
        note: 'Should handle gracefully'
      },
      {
        name: 'empty module call',
        code: 'module test() {}; test();',
        note: 'Should handle empty modules'
      },
      {
        name: 'infinite loop prevention',
        code: 'for (i = [0:1]) { translate([i*10, 0, 0]) cube(5); }',
        note: 'Should complete normally'
      }
    ];

    const results: TestResult[] = [];
    for (const test of tests) {
      const result = await this.runTest(test.name, test.code);
      result.notes = test.note || '';
      results.push(result);
    }

    return {
      name: 'Error Handling',
      tests: results,
      summary: this.calculateSummary(results)
    };
  }

  private calculateSummary(results: TestResult[]) {
    const total = results.length;
    const passed = results.filter(r => r.success).length;
    const failed = total - passed;
    const passRate = Math.round((passed / total) * 100);

    return { total, passed, failed, passRate };
  }

  async runFullTestSuite(): Promise<void> {
    console.log('🚀 Starting Comprehensive OpenSCAD Compatibility Tests\n');
    
    await this.initialize();

    // Run all test suites
    this.results.push(await this.runCorePrimitivesTests());
    console.log('✅ Core Primitives Tests completed');

    this.results.push(await this.runTransformationsTests());
    console.log('✅ Transformations Tests completed');

    this.results.push(await this.runBooleanOperationsTests());
    console.log('✅ Boolean Operations Tests completed');

    this.results.push(await this.runLanguageFeaturesTests());
    console.log('✅ Language Features Tests completed');

    this.results.push(await this.runAdvancedFeaturesTests());
    console.log('✅ Advanced Features Tests completed');

    this.results.push(await this.runSpecialVariablesTests());
    console.log('✅ Special Variables Tests completed');

    this.results.push(await this.runComplexCombinationsTests());
    console.log('✅ Complex Combinations Tests completed');

    this.results.push(await this.runErrorHandlingTests());
    console.log('✅ Error Handling Tests completed');

    this.printFinalReport();
  }

  private printFinalReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE OPENSCAD COMPATIBILITY REPORT');
    console.log('='.repeat(80));

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    for (const suite of this.results) {
      console.log(`\n📁 ${suite.name}`);
      console.log('-'.repeat(60));
      
      for (const test of suite.tests) {
        const status = test.success ? '✅' : '❌';
        const time = test.executionTime ? `${test.executionTime.toFixed(1)}ms` : 'N/A';
        
        console.log(`${status} ${test.name} (${time})`);
        
        if (!test.success) {
          if (test.parseErrors.length > 0) {
            console.log(`   🔸 Parse errors: ${test.parseErrors.join(', ')}`);
          }
          if (test.evaluationErrors.length > 0) {
            console.log(`   🔸 Eval errors: ${test.evaluationErrors.join(', ')}`);
          }
        }
        
        if (test.notes) {
          console.log(`   📝 ${test.notes}`);
        }
      }
      
      console.log(`\n📈 ${suite.name} Summary: ${suite.summary.passed}/${suite.summary.total} passed (${suite.summary.passRate}%)`);
      
      totalTests += suite.summary.total;
      totalPassed += suite.summary.passed;
      totalFailed += suite.summary.failed;
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 FINAL COMPATIBILITY ASSESSMENT');
    console.log('='.repeat(80));
    
    const overallPassRate = Math.round((totalPassed / totalTests) * 100);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Overall Compatibility: ${overallPassRate}%`);

    // Compatibility classification
    let classification = '';
    if (overallPassRate >= 95) {
      classification = '🏆 EXCELLENT - Nearly 100% OpenSCAD Compatible';
    } else if (overallPassRate >= 90) {
      classification = '🥇 VERY GOOD - Highly Compatible';
    } else if (overallPassRate >= 80) {
      classification = '🥈 GOOD - Mostly Compatible';
    } else if (overallPassRate >= 70) {
      classification = '🥉 FAIR - Partially Compatible';
    } else {
      classification = '⚠️  LIMITED - Major Compatibility Issues';
    }
    
    console.log(`Classification: ${classification}`);

    // Feature-specific assessment
    console.log('\n📋 FEATURE BREAKDOWN:');
    for (const suite of this.results) {
      const status = suite.summary.passRate >= 90 ? '✅' : 
                   suite.summary.passRate >= 70 ? '⚠️' : '❌';
      console.log(`${status} ${suite.name}: ${suite.summary.passRate}%`);
    }

    console.log('\n🔍 RECOMMENDATIONS:');
    
    const failingSuites = this.results.filter(s => s.summary.passRate < 90);
    if (failingSuites.length === 0) {
      console.log('🎉 All major features are working correctly!');
    } else {
      console.log('Focus areas for improvement:');
      for (const suite of failingSuites) {
        const failedTests = suite.tests.filter(t => !t.success);
        console.log(`\n   ${suite.name} (${failedTests.length} failing):`);
        for (const test of failedTests.slice(0, 3)) { // Show first 3 failures
          console.log(`     - ${test.name}`);
        }
        if (failedTests.length > 3) {
          console.log(`     ... and ${failedTests.length - 3} more`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🏁 TESTING COMPLETE');
    console.log('='.repeat(80));
  }
}

// Run the comprehensive test suite
const validator = new ComprehensiveValidator();
validator.runFullTestSuite().catch(console.error);