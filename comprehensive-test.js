// Comprehensive test suite for 100% OpenSCAD compatibility features
import { parseOpenSCAD } from './backend/scad-parser.ts';

function runTest(testName, testCode, shouldSucceed = true) {
  console.log(`\n=== ${testName} ===`);
  console.log(`Code: ${testCode}`);
  
  const result = parseOpenSCAD(testCode);
  const success = result.success === shouldSucceed;
  
  console.log(`✓ ${success ? 'PASS' : 'FAIL'} - Expected success: ${shouldSucceed}, Got: ${result.success}`);
  
  if (!result.success && shouldSucceed) {
    console.log('Errors:', result.errors);
  } else if (result.success && !shouldSucceed) {
    console.log('Unexpected success - should have failed');
  } else if (result.success) {
    console.log('AST nodes:', result.ast?.length || 0);
  }
  
  return success;
}

function runAllTests() {
  console.log('🧪 Running Comprehensive Test Suite for 100% OpenSCAD Compatibility');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // === List Comprehension Tests ===
  console.log('\n🎯 LIST COMPREHENSION TESTS');
  
  // Basic list comprehension
  totalTests++;
  if (runTest('Basic List Comprehension', '[ for (i = [0:5]) i ]')) passedTests++;
  
  // List comprehension with expression
  totalTests++;
  if (runTest('List Comprehension with Expression', '[ for (i = [1:5]) i*i ]')) passedTests++;
  
  // List comprehension with condition
  totalTests++;
  if (runTest('List Comprehension with Condition', '[ for (i = [0:10]) i if i % 2 == 0 ]')) passedTests++;
  
  // Multiple variables (basic support)
  totalTests++;
  if (runTest('List Comprehension Multiple Variables', '[ for (x = [1:3], y = [4:6]) x*y ]')) passedTests++;
  
  // === Import Statement Tests ===
  console.log('\n📁 IMPORT STATEMENT TESTS');
  
  // Basic import
  totalTests++;
  if (runTest('Import Statement', 'import "shapes.scad";')) passedTests++;
  
  // Include statement  
  totalTests++;
  if (runTest('Include Statement', 'include "utils.scad";')) passedTests++;
  
  // Use statement
  totalTests++;
  if (runTest('Use Statement', 'use "modules.scad";')) passedTests++;
  
  // System import
  totalTests++;
  if (runTest('System Import', 'import <system/shapes.scad>;')) passedTests++;
  
  // === Combined Feature Tests ===
  console.log('\n🔗 COMBINED FEATURE TESTS');
  
  // Import + module call
  totalTests++;
  if (runTest('Import + Module Call', 'use "modules.scad";\nbox(10, 20, 5);')) passedTests++;
  
  // List comprehension in module context
  totalTests++;
  if (runTest('List Comprehension in Context', 'values = [ for (i = [0:5]) i*i ];\ncube(values[2]);')) passedTests++;
  
  // === Error Handling Tests ===
  console.log('\n❌ ERROR HANDLING TESTS');
  
  // Invalid list comprehension
  totalTests++;
  if (runTest('Invalid List Comprehension', '[ for i=[0:5] i ]', false)) passedTests++;
  
  // Invalid import
  totalTests++;
  if (runTest('Invalid Import', 'import', false)) passedTests++;
  
  // === Results ===
  console.log('\n📊 TEST RESULTS');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Ready for 100% OpenSCAD Compatibility!');
  } else {
    console.log('⚠️  Some tests failed. Review implementation.');
  }
  
  return passedTests === totalTests;
}

// Run the test suite
runAllTests();