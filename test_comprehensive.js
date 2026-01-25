#!/usr/bin/env bun
/**
 * Comprehensive OpenSCAD Compatibility Test Suite
 * Tests all implemented features for moicad OpenSCAD clone
 */

class MoicadTestSuite {
  #baseUrl = 'http://localhost:3000';
  #results = [];

  async runTest(feature, testName, code) {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.#baseUrl}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      const result = await response.json();
      const executionTime = Date.now() - startTime;
      
      return {
        feature,
        test: testName,
        code,
        success: result.success && (!result.errors || result.errors.length === 0),
        geometry: result.geometry,
        errors: result.errors,
        executionTime,
        notes: result.success ? `✓ ${executionTime}ms` : '✗ Failed'
      };
    } catch (error) {
      return {
        feature,
        test: testName,
        code,
        success: false,
        errors: [{ message: error.message }],
        notes: `✗ Network error: ${error.message}`
      };
    }
  }

  async testFeature(featureName, tests) {
    console.log(`\n🧪 Testing ${featureName}...`);
    const testResults = [];
    
    for (const test of tests) {
      const result = await this.runTest(featureName, test.name, test.code);
      testResults.push(result);
      console.log(`  ${result.success ? '✓' : '✗'} ${test.name} - ${result.notes}`);
      
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(err => console.log(`    Error: ${err.message}`));
      }
    }
    
    const successCount = testResults.filter(r => r.success).length;
    const successRate = (successCount / testResults.length) * 100;
    const issues = testResults.filter(r => !r.success).map(r => `${r.test}: ${r.errors?.map(e => e.message).join(', ')}`);
    
    const report = {
      name: featureName,
      tests: testResults,
      successRate,
      issues
    };
    
    this.#results.push(report);
    return report;
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE OPENSCAD COMPATIBILITY REPORT');
    console.log('='.repeat(80));
    
    let totalTests = 0;
    let totalPassed = 0;
    
    this.#results.forEach(feature => {
      console.log(`\n🔧 ${feature.name}`);
      console.log(`   Success Rate: ${feature.successRate.toFixed(1)}% (${feature.tests.filter(t => t.success).length}/${feature.tests.length})`);
      
      if (feature.issues.length > 0) {
        console.log('   Issues:');
        feature.issues.forEach(issue => console.log(`     - ${issue}`));
      }
      
      totalTests += feature.tests.length;
      totalPassed += feature.tests.filter(t => t.success).length;
    });
    
    const overallSuccess = (totalPassed / totalTests) * 100;
    console.log('\n' + '='.repeat(80));
    console.log(`🎯 OVERALL COMPATIBILITY: ${overallSuccess.toFixed(1)}% (${totalPassed}/${totalTests} tests passed)`);
    console.log('='.repeat(80));
    
    // Grade the compatibility
    let grade = 'F';
    if (overallSuccess >= 95) grade = 'A+';
    else if (overallSuccess >= 90) grade = 'A';
    else if (overallSuccess >= 85) grade = 'B+';
    else if (overallSuccess >= 80) grade = 'B';
    else if (overallSuccess >= 70) grade = 'C';
    else if (overallSuccess >= 60) grade = 'D';
    
    console.log(`📈 Grade: ${grade}`);
    
    if (overallSuccess >= 90) {
      console.log('🎉 EXCELLENT! Ready for production use!');
    } else if (overallSuccess >= 80) {
      console.log('✅ GOOD! Minor issues need fixing.');
    } else if (overallSuccess >= 70) {
      console.log('⚠️  FAIR! Significant issues need attention.');
    } else {
      console.log('❌ POOR! Major redevelopment needed.');
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive OpenSCAD Compatibility Tests...\n');
    
    // 1. Core Primitives
    await this.testFeature('Core Primitives', [
      { name: 'cube() default', code: 'cube();' },
      { name: 'cube(size)', code: 'cube(10);' },
      { name: 'cube([x,y,z])', code: 'cube([10, 20, 5]);' },
      { name: 'sphere() default', code: 'sphere();' },
      { name: 'sphere(r)', code: 'sphere(10);' },
      { name: 'sphere(radius)', code: 'sphere(radius=10);' },
      { name: 'sphere(d)', code: 'sphere(d=20);' },
      { name: 'cylinder() default', code: 'cylinder();' },
      { name: 'cylinder(h,r)', code: 'cylinder(10, 5);' },
      { name: 'cylinder(h,r1,r2)', code: 'cylinder(10, 5, 8);' },
      { name: 'cone() default', code: 'cone();' },
      { name: 'cone(h,r)', code: 'cone(15, 8);' },
      { name: 'circle() default', code: 'circle();' },
      { name: 'circle(r)', code: 'circle(10);' },
      { name: 'square() default', code: 'square();' },
      { name: 'square(size)', code: 'square([15, 10]);' }
    ]);

    // 2. Custom Shapes
    await this.testFeature('Custom Shapes', [
      { name: 'polygon() simple', code: 'polygon([[0,0], [10,0], [5,8]]);' },
      { name: 'polygon() complex', code: 'polygon([[0,0], [20,0], [25,10], [15,15], [5,10]]);' },
      { name: 'polyhedron() simple', code: 'polyhedron([[0,0,0], [10,0,0], [5,8,0], [5,4,10]], [[0,1,2], [0,1,3], [1,2,3], [0,2,3]]);' }
    ]);

    // 3. Transformations
    await this.testFeature('Transformations', [
      { name: 'translate() simple', code: 'translate([5, 10, 15]) cube(10);' },
      { name: 'translate() nested', code: 'translate([5,0,0]) translate([0,5,0]) cube(10);' },
      { name: 'rotate() single axis', code: 'rotate(45) cube(10);' },
      { name: 'rotate() multi axis', code: 'rotate([45, 30, 60]) cube(10);' },
      { name: 'scale() uniform', code: 'scale(2) cube(10);' },
      { name: 'scale() non-uniform', code: 'scale([2, 1.5, 0.5]) cube(10);' },
      { name: 'mirror() axis', code: 'mirror([1, 0, 0]) cube(10);' },
      { name: 'multmatrix() identity', code: 'multmatrix([[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]) cube(10);' },
      { name: 'multmatrix() transform', code: 'multmatrix([[1,0,0,5],[0,1,0,10],[0,0,1,15],[0,0,0,1]]) sphere(5);' }
    ]);

    // 4. Extrusion Operations
    await this.testFeature('Extrusion Operations', [
      { name: 'linear_extrude() simple', code: 'linear_extrude(10) circle(5);' },
      { name: 'linear_extrude() twist', code: 'linear_extrude(10, twist=45) square([5, 3]);' },
      { name: 'linear_extrude() scale', code: 'linear_extrude(10, scale=2) circle(5);' },
      { name: 'linear_extrude() slices', code: 'linear_extrude(10, slices=20) circle(5);' },
      { name: 'rotate_extrude() simple', code: 'rotate_extrude($fn=32) translate([10, 0]) circle(3);' },
      { name: 'rotate_extrude() angle', code: 'rotate_extrude(angle=180, $fn=16) translate([8, 0]) square([4, 2]);' }
    ]);

    // 5. Boolean Operations
    await this.testFeature('Boolean Operations', [
      { name: 'union() simple', code: 'union() { cube(10); sphere(5); }' },
      { name: 'union() multiple', code: 'union() { cube(10); sphere(5); cylinder(8, 3); }' },
      { name: 'difference() simple', code: 'difference() { cube(10); sphere(8); }' },
      { name: 'difference() multiple', code: 'difference() { cube(10); sphere(6); cylinder(12, 2); }' },
      { name: 'intersection() simple', code: 'intersection() { cube(10); sphere(8); }' },
      { name: 'hull() simple', code: 'hull() { translate([-10, 0, 0]) sphere(5); translate([10, 0, 0]) sphere(5); }' },
      { name: 'hull() multiple', code: 'hull() { cube(10); translate([15, 0, 0]) sphere(5); }' },
      { name: 'minkowski() simple', code: 'minkowski() { cube(10); sphere(2); }' }
    ]);

    // 6. Variables and Assignments
    await this.testFeature('Variables and Assignments', [
      { name: 'variable assignment', code: 'size = 10; cube(size);' },
      { name: 'multiple variables', code: 'width = 20; height = 10; depth = 5; cube([width, height, depth]);' },
      { name: 'variable expression', code: 'size = 10; result = size * 2 + 5; cube(result);' },
      { name: 'variable reassignment', code: 'size = 10; size = 15; cube(size);' }
    ]);

    // 7. Functions
    await this.testFeature('Functions', [
      { name: 'simple function', code: 'function double(x) = x * 2; cube(double(5));' },
      { name: 'multi-param function', code: 'function area(w, h) = w * h; cube([area(3, 4), 5, 6]);' },
      { name: 'function with math', code: 'function distance(x, y) = sqrt(x*x + y*y); cube(distance(3, 4));' },
      { name: 'recursive function', code: 'function factorial(n) = n <= 1 ? 1 : n * factorial(n-1); cube(factorial(3));' }
    ]);

    // 8. Modules
    await this.testFeature('Modules', [
      { name: 'simple module', code: 'module box(w, h, d) { cube([w, h, d]); } box(10, 20, 5);' },
      { name: 'module with default params', code: 'module box(w=10, h=20, d=5) { cube([w, h, d]); } box(h=15);' },
      { name: 'module with children', code: 'module frame(size) { difference() { cube(size); translate([2,2,2]) cube([size-4, size-4, size-4]); } } frame(20);' },
      { name: 'nested modules', code: 'module leg(h) { cylinder(h, 2); } module table() { union() { leg(10); translate([10,0,0]) leg(10); } } table();' }
    ]);

    // 9. Conditional Statements
    await this.testFeature('Conditional Statements', [
      { name: 'if statement true', code: 'enable = true; if (enable) { cube(10); }' },
      { name: 'if statement false', code: 'enable = false; if (enable) { cube(10); } else { sphere(10); }' },
      { name: 'if-else chain', code: 'size = 15; if (size < 10) { cube(5); } else if (size < 20) { cube(10); } else { cube(20); }' },
      { name: 'conditional expression', code: 'size = 15; result = size > 10 ? 20 : 5; cube(result);' }
    ]);

    // 10. For Loops
    await this.testFeature('For Loops', [
      { name: 'simple for loop', code: 'for (i = [0:4]) { translate([i*10, 0, 0]) cube(5); }' },
      { name: 'for loop with step', code: 'for (i = [0:2:10]) { translate([i, 0, 0]) sphere(2); }' },
      { name: 'nested for loops', code: 'for (x = [0:2]) { for (y = [0:2]) { translate([x*10, y*10, 0]) cube(5); } }' },
      { name: 'for loop with expressions', code: 'for (i = [1:3]) { cube([i*5, i*5, i*5]); }' }
    ]);

    // 11. Let Statements
    await this.testFeature('Let Statements', [
      { name: 'let simple', code: 'let(size = 10) cube(size);' },
      { name: 'let multiple', code: 'let(width = 20, height = 10) cube([width, height, 5]);' },
      { name: 'let with expression', code: 'let(size = 5*2) cube(size);' },
      { name: 'let scoped', code: 'cube(10); let(size = 15) cube(size); cube(10);' }
    ]);

    // 12. List Comprehensions
    await this.testFeature('List Comprehensions', [
      { name: 'simple list comprehension', code: 'points = [for (i = [0:4]) i*10]; cube(points[0]);' },
      { name: 'list comprehension with expression', code: 'sizes = [for (i = [1:3]) i*5]; for (i = [0:len(sizes)-1]) { translate([i*10, 0, 0]) cube(sizes[i]); }' },
      { name: 'nested list comprehension', code: 'points = [for (x = [0:2]) for (y = [0:2]) [x*10, y*10]]; translate(points[0]) cube(5);' },
      { name: 'list comprehension with condition', code: 'values = [for (i = [0:10]) if (i % 2 == 0) i]; cube(values[0]);' }
    ]);

    // 13. Built-in Math Functions
    await this.testFeature('Built-in Math Functions', [
      { name: 'abs()', code: 'cube(abs(-5));' },
      { name: 'ceil()', code: 'cube(ceil(4.2));' },
      { name: 'floor()', code: 'cube(floor(4.8));' },
      { name: 'round()', code: 'cube(round(4.5));' },
      { name: 'sqrt()', code: 'cube(sqrt(25));' },
      { name: 'pow()', code: 'cube(pow(3, 2));' },
      { name: 'sin()', code: 'rotate([sin(45)*45, 0, 0]) cube(10);' },
      { name: 'cos()', code: 'rotate([0, cos(30)*90, 0]) cube(10);' },
      { name: 'tan()', code: 'rotate([0, 0, tan(45)*45]) cube(10);' },
      { name: 'min()', code: 'cube(min(5, 8, 3));' },
      { name: 'max()', code: 'cube(max(5, 8, 3));' },
      { name: 'len() array', code: 'arr = [1, 2, 3, 4]; cube(len(arr));' }
    ]);

    // 14. String Functions
    await this.testFeature('String Functions', [
      { name: 'str() simple', code: 'echo(str("Hello", " ", "World")); cube(10);' },
      { name: 'str() with numbers', code: 'echo(str("Size:", 10)); cube(10);' },
      { name: 'chr()', code: 'echo(chr(65)); cube(10);' },
      { name: 'ord()', code: 'echo(ord("A")); cube(10);' }
    ]);

    // 15. Vector Functions
    await this.testFeature('Vector Functions', [
      { name: 'norm() vector', code: 'vec = [3, 4]; cube(norm(vec));' },
      { name: 'cross() product', code: 'v1 = [1, 0, 0]; v2 = [0, 1, 0]; result = cross(v1, v2); cube(abs(result[2])*10);' },
      { name: 'concat() arrays', code: 'arr1 = [1, 2]; arr2 = [3, 4]; combined = concat(arr1, arr2); cube(combined[0]*10);' }
    ]);

    // 16. Debug Utilities
    await this.testFeature('Debug Utilities', [
      { name: 'echo() simple', code: 'echo("Hello World"); cube(10);' },
      { name: 'echo() variables', code: 'size = 10; echo("Size is:", size); cube(size);' },
      { name: 'echo() multiple', code: 'echo("A", 42, [1, 2, 3]); cube(10);' },
      { name: 'assert() true', code: 'assert(10 > 5) cube(10);' },
      { name: 'assert() with message', code: 'assert(10 > 5, "Size must be greater than 5") cube(10);' }
    ]);

    // 17. Special Variables
    await this.testFeature('Special Variables', [
      { name: '$fn global', code: '$fn = 16; sphere(10);' },
      { name: '$fn in sphere', code: 'sphere(10, $fn=32);' },
      { name: '$fa fragment angle', code: '$fa = 12; sphere(10);' },
      { name: '$fs fragment size', code: '$fs = 2; sphere(10);' },
      { name: '$t animation time', code: 'rotate([0, 0, $t*360]) cube(10);' }
    ]);

    // 18. Color and Visualization Modifiers
    await this.testFeature('Color and Modifiers', [
      { name: 'color() simple', code: 'color([1, 0, 0]) cube(10);' },
      { name: 'color() rgba', code: 'color([0, 1, 0, 0.5]) cube(10);' },
      { name: 'color() named', code: 'color("red") cube(10);' },
      { name: 'modifier !', code: '!cube(10);' },
      { name: 'modifier #', code: '#cube(10);' },
      { name: 'modifier %', code: '%cube(10);' },
      { name: 'modifier *', code: '*cube(10);' }
    ]);

    // 19. Error Handling
    await this.testFeature('Error Handling', [
      { name: 'syntax error', code: 'cube(10' }, // missing closing parenthesis
      { name: 'undefined variable', code: 'cube(undefined_var);' },
      { name: 'undefined function', code: 'cube(undefined_func(10));' },
      { name: 'invalid parameters', code: 'sphere("invalid");' },
      { name: 'missing required param', code: 'cylinder();' } // requires height parameter
    ]);

    // 20. Complex Combinations
    await this.testFeature('Complex Combinations', [
      { name: 'nested transforms + booleans', code: 'difference() { cube(20); union() { translate([5, 5, 5]) sphere(8); translate([15, 15, 15]) sphere(6); } }' },
      { name: 'modules with variables', code: 'size = 10; module create_box() { cube(size); } translate([size, 0, 0]) create_box();' },
      { name: 'functions in modules', code: 'function double(x) = x * 2; module sized_cube(s) { cube(double(s)); } sized_cube(5);' },
      { name: 'loops with conditionals', code: 'for (i = [0:4]) { if (i % 2 == 0) { translate([i*10, 0, 0]) cube(5); } else { translate([i*10, 10, 0]) sphere(3); } }' },
      { name: 'let with comprehensions', code: 'let(sizes = [for (i = [1:3]) i*5]) { for (i = [0:len(sizes)-1]) translate([i*10, 0, 0]) cube(sizes[i]); }' }
    ]);

    // Generate final report
    this.generateReport();
  }
}

// Run the test suite
const testSuite = new MoicadTestSuite();
testSuite.runAllTests().catch(console.error);