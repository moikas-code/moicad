#!/usr/bin/env node
/**
 * Quick List Comprehension Test
 */

class ListComprehensionTester {
  #baseUrl = 'http://localhost:3000';

  async runTest(testObj) {
    const testName = testObj.name;
    const code = testObj.code;
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
        name: testName,
        code,
        success: result.success,
        errors: result.errors || [],
        executionTime,
        notes: result.success ? `✓ ${executionTime}ms` : '✗ Failed'
      };
    } catch (error) {
      return {
        testName,
        code,
        success: false,
        errors: [{ message: error.message }],
        notes: `✗ Network error: ${error.message}`
      };
    }
  }

  async testFeature(featureName, tests) {
    console.log(`\n🧪 Testing ${featureName}...`);
    
    for (const test of tests) {
      console.log('Test object:', test);
      const result = await this.runTest(test);
      console.log(`  ${result.success ? '✓' : '✗'} ${result.name} - ${result.notes}`);
      
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(err => console.log(`    Error: ${err.message}`));
      }
    }
  }
}

async function testListComprehensions() {
  const tester = new ListComprehensionTester();
  
  await tester.testFeature('List Comprehensions', [
    { name: 'simple list comprehension', code: 'points = [for (i = [0:4]) i*10]; cube(points[0]);' },
    { name: 'list comprehension with expression', code: 'sizes = [for (i = [1:3]) i*5]; cube(sizes[0]);' },
    { name: 'nested list comprehension', code: 'points = [for (x = [0:2]) for (y = [0:2]) x+y]; cube(points[0]);' },
    { name: 'list comprehension with condition', code: 'values = [for (i = [0:10]) if (i % 2 == 0) i]; cube(values[0]);' }
  ]);
}

testListComprehensions().then(() => {
  console.log('\n✅ List comprehension tests completed!');
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});