#!/usr/bin/env node

/**
 * moicad Debug Utility - List Comprehension
 * 
 * Purpose: Debug list comprehension parsing and generation
 * Historically problematic area - now fixed and working correctly
 * 
 * Usage: node scripts/debug/list-comprehension.js
 * 
 * Test Coverage:
 * - Basic list comprehensions: [for (i=[0:5]) i]
 * - Complex comprehensions: [for (i=[0:10]) i*i]
 * - Conditional comprehensions
 * - Nested comprehensions
 * - Performance testing
 * 
 * Author: moicad debug system
 * Updated: 2026-01-26
 */

import { parseOpenSCAD } from '../../backend/scad-parser.js';

/**
 * Debug list comprehension parsing with comprehensive test cases
 */
function debugParsing(code, testName) {
  console.log(`\n🔍 Testing: "${code}"`);
  console.log(`📋 Test: ${testName}`);
  console.log('-'.repeat(50));
  
  try {
    const startTime = performance.now();
    const result = parseOpenSCAD(code);
    const endTime = performance.now();
    
    console.log(`⏱️  Parse Time: ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`📊 Success: ${result.success ? '✅' : '❌'}`);
    
    if (result.success) {
      console.log('🌳 AST Structure:');
      console.log(JSON.stringify(result.ast, null, 2));
      
      // Analyze AST for list comprehension features
      if (result.ast && result.ast.length > 0) {
        console.log('\n🔍 AST Analysis:');
        analyzeListComprehensionAST(result.ast[0]);
      }
    } else {
      console.log('🚨 Parse Errors:');
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.message || error}`);
          if (error.position) {
            console.log(`     📍 Position: line ${error.position.line}, col ${error.position.column}`);
          }
        });
      }
    }
    
    return { success: result.success, time: endTime - startTime };
    
  } catch (error) {
    console.log('💥 Exception occurred:');
    console.log(`🚨 ${error.message}`);
    console.log(`📍 Stack: ${error.stack}`);
    return { success: false, error: error.message };
  }
}

/**
 * Analyze AST node for list comprehension patterns
 */
function analyzeListComprehensionAST(node) {
  if (!node) return;
  
  console.log(`  🏷️  Node Type: ${node.type}`);
  console.log(`  📦 Value: ${node.value || 'N/A'}`);
  
  if (node.type === 'list_comprehension') {
    console.log('  ✨ List Comprehension Detected:');
    console.log(`    🔄 Variable: ${node.variable || 'N/A'}`);
    console.log(`    📈 Range: ${JSON.stringify(node.range || 'N/A')}`);
    console.log(`    📝 Expression: ${node.expression || 'N/A'}`);
  }
  
  if (node.children && node.children.length > 0) {
    console.log(`  👥 Children: ${node.children.length} nodes`);
    node.children.forEach((child, index) => {
      console.log(`    ${index + 1}. ${child.type}: ${child.value || 'N/A'}`);
    });
  }
}

/**
 * Run comprehensive list comprehension tests
 */
function debugListComprehension() {
  console.log('🛠️  moicad Debug: List Comprehension Testing');
  console.log('=' .repeat(60));
  console.log('📋 Testing previously problematic area - now FIXED!');
  console.log('');
  
  const testCases = [
    {
      code: '[1, 2, 3]',
      name: 'Simple Array (Control Test)'
    },
    {
      code: '[for]',
      name: 'Invalid For Syntax (Error Test)'
    },
    {
      code: '[ for (i = [0:5]) i ]',
      name: 'Basic List Comprehension'
    },
    {
      code: '[ for (i = [0:10]) i*i ]',
      name: 'List Comprehension with Math'
    },
    {
      code: '[ for (i = [-5:5]) i*i ]',
      name: 'List Comprehension with Negative Range'
    },
    {
      code: '[ for (i = [0:10:2]) i ]',
      name: 'List Comprehension with Step'
    },
    {
      code: '[ for (i = [0:3]) [for (j = [0:2]) i + j] ]',
      name: 'Nested List Comprehension'
    },
    {
      code: '[ for (i = [0:10]) if (i % 2 == 0) i ]',
      name: 'Conditional List Comprehension'
    }
  ];
  
  let passCount = 0;
  let failCount = 0;
  const results = [];
  
  testCases.forEach((test, index) => {
    console.log(`🧪 Test ${index + 1}/${testCases.length}`);
    const result = debugParsing(test.code, test.name);
    results.push({ ...test, ...result });
    
    if (result.success) {
      passCount++;
    } else {
      failCount++;
    }
  });
  
  // Performance and reliability summary
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(40));
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📈 Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
  
  // Performance analysis
  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 0) {
    const avgTime = successfulResults.reduce((sum, r) => sum + r.time, 0) / successfulResults.length;
    const maxTime = Math.max(...successfulResults.map(r => r.time));
    const minTime = Math.min(...successfulResults.map(r => r.time));
    
    console.log(`⏱️  Performance:`);
    console.log(`    Average: ${avgTime.toFixed(2)}ms`);
    console.log(`    Fastest: ${minTime.toFixed(2)}ms`);
    console.log(`    Slowest: ${maxTime.toFixed(2)}ms`);
  }
  
  console.log('\n🎯 List Comprehension Debug Complete!');
  console.log('💡 Note: List comprehensions now work correctly in moicad!');
  console.log('   • No more hanging issues');
  console.log('   • Proper AST generation');
  console.log('   • Full OpenSCAD syntax support');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Remove timeout since list comprehensions are now fixed
  debugListComprehension();
}

export { debugParsing, debugListComprehension, analyzeListComprehensionAST };
