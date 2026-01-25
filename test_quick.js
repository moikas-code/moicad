#!/usr/bin/env bun
/**
 * Quick Feature Assessment Test
 * Tests key features to assess current state
 */

class QuickTest {
  async test(code, name) {
    try {
      const response = await fetch('http://localhost:3000/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      const result = await response.json();
      console.log(`${result.success ? '✓' : '✗'} ${name}`);
      if (!result.success && result.errors) {
        console.log(`    Error: ${result.errors[0]?.message}`);
      }
      return result.success;
    } catch (error) {
      console.log(`✗ ${name} - Network error: ${error.message}`);
      return false;
    }
  }

  async runQuickTests() {
    console.log('🔍 Quick Feature Assessment\n');
    
    let passed = 0;
    let total = 0;

    // Core primitives
    console.log('📦 Core Primitives:');
    const primitives = [
      ['cube();', 'cube default'],
      ['sphere(10);', 'sphere'],
      ['cylinder(10, 5);', 'cylinder'],
      ['cone(15, 8);', 'cone'],
      ['circle(10);', 'circle'],
      ['square([10, 5]);', 'square']
    ];
    
    for (const [code, name] of primitives) {
      total++;
      if (await this.test(code, name)) passed++;
    }

    // Basic transformations
    console.log('\n🔄 Transformations:');
    const transforms = [
      ['translate([5,0,0]) cube(10);', 'translate'],
      ['rotate(45) cube(10);', 'rotate'],
      ['scale(2) cube(10);', 'scale'],
      ['mirror([1,0,0]) cube(10);', 'mirror']
    ];
    
    for (const [code, name] of transforms) {
      total++;
      if (await this.test(code, name)) passed++;
    }

    // Boolean operations
    console.log('\n🔗 Boolean Operations:');
    const booleans = [
      ['union() { cube(10); sphere(5); }', 'union'],
      ['difference() { cube(10); sphere(8); }', 'difference'],
      ['intersection() { cube(10); sphere(8); }', 'intersection'],
      ['hull() { sphere(5); translate([10,0,0]) sphere(5); }', 'hull']
    ];
    
    for (const [code, name] of booleans) {
      total++;
      if (await this.test(code, name)) passed++;
    }

    // Language features
    console.log('\n💻 Language Features:');
    const language = [
      ['size = 10; cube(size);', 'variables'],
      ['function double(x) = x * 2; cube(double(5));', 'functions'],
      ['module box(s) { cube(s); } box(10);', 'modules'],
      ['if (true) { cube(10); }', 'if statements'],
      ['for (i = [0:2]) { translate([i*10, 0, 0]) cube(5); }', 'for loops']
    ];
    
    for (const [code, name] of language) {
      total++;
      if (await this.test(code, name)) passed++;
    }

    // Known problematic features
    console.log('\n⚠️  Known Issues:');
    const problematic = [
      ['polygon([[0,0], [10,0], [5,8]]);', 'polygon (missing WASM)'],
      ['linear_extrude(10) circle(5);', 'linear_extrude (issues)'],
      ['color([1,0,0]) cube(10);', 'color (parser support)'],
      ['multmatrix([[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]]) cube(10);', 'multmatrix (syntax)'],
      ['minkowski() { cube(10); sphere(2); }', 'minkowski (missing WASM)']
    ];
    
    for (const [code, name] of problematic) {
      total++;
      await this.test(code, name);
    }

    // Summary
    const percentage = (passed / total * 100).toFixed(1);
    console.log(`\n📊 Quick Assessment: ${passed}/${total} (${percentage}%)`);
    
    if (percentage >= '80') {
      console.log('✅ Good! Core functionality works well');
    } else if (percentage >= '60') {
      console.log('⚠️  Fair! Some core features need attention');
    } else {
      console.log('❌ Poor! Major issues with core features');
    }
  }
}

const quickTest = new QuickTest();
quickTest.runQuickTests().catch(console.error);