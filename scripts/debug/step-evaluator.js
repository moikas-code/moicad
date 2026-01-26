#!/usr/bin/env node

/**
 * moicad Debug Utility - Step-by-Step Evaluator
 * 
 * Purpose: Debug parser with incremental token-by-token analysis
 * Useful for identifying exactly where parsing fails and why
 * 
 * Usage: node scripts/debug/step-evaluator.js
 * 
 * Features:
 * - Incremental parsing analysis
 * - Token-by-token breakdown
 * - Error identification at specific positions
 * 
 * Author: moicad debug system
 * Updated: 2026-01-26
 */

import { parseOpenSCAD } from '../../backend/scad-parser.js';

/**
 * Test parsing step by step to identify failure points
 */
function debugStepByStep() {
  console.log('🔍 moicad Debug: Step-by-Step Evaluator');
  console.log('=' .repeat(50));
  
  const progressiveTests = [
    {
      name: 'Test 1: Array Start',
      code: '['
    },
    {
      name: 'Test 2: Array + For',
      code: '[ for'
    },
    {
      name: 'Test 3: Array + For + LParen',
      code: '[ for ('
    },
    {
      name: 'Test 4: Array + For + Variable',
      code: '[ for (i'
    },
    {
      name: 'Test 5: Array + For + Assignment',
      code: '[ for (i ='
    },
    {
      name: 'Test 6: Array + For + Range Start',
      code: '[ for (i = [0'
    },
    {
      name: 'Test 7: Array + For + Range End',
      code: '[ for (i = [0:10'
    },
    {
      name: 'Test 8: Array + For + Range Close',
      code: '[ for (i = [0:10])'
    },
    {
      name: 'Test 9: Complete List Comprehension',
      code: '[ for (i = [0:10]) i ]'
    }
  ];
  
  console.log('📋 Progressive Parsing Analysis:');
  console.log('Testing incremental assembly of list comprehension syntax\n');
  
  progressiveTests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}`);
    console.log(`   Code: "${test.code}"`);
    console.log('   Result:');
    
    try {
      const result = parseOpenSCAD(test.code);
      
      if (result.success) {
        console.log('   ✅ Parsed successfully');
        if (result.ast && result.ast.length > 0) {
          console.log('   🌳 AST nodes:', result.ast.length);
        }
      } else {
        console.log('   ❌ Parse failed');
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(error => {
            console.log(`   🚨 Error: ${error.message || error}`);
            if (error.position) {
              console.log(`   📍 Position: line ${error.position.line}, col ${error.position.column}`);
            }
          });
        }
      }
    } catch (error) {
      console.log('   💥 Exception occurred');
      console.log(`   🚨 ${error.message}`);
    }
    
    console.log('   ' + '-'.repeat(40));
  });
  
  // Summary analysis
  console.log('\n📊 Analysis Summary:');
  console.log('This progressive testing helps identify:');
  console.log('  • Exact syntax point where parsing fails');
  console.log('  • Whether tokenizer recognizes tokens correctly');
  console.log('  • Parser state progression');
  console.log('  • Grammar rule matching issues');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugStepByStep();
}

export { debugStepByStep };
