#!/usr/bin/env node

/**
 * moicad Debug Utility - Range Parser
 * 
 * Purpose: Debug and test range parsing functionality in OpenSCAD parser
 * Range syntax includes: [start:end], [start:step:end], for loops with ranges
 * 
 * Usage: node scripts/debug/range-parser.js
 * 
 * Examples tested:
 * - Basic range: [0:10]
 * - Variable assignment: i = [0:10]
 * - Loop with range: for (i = [0:10])
 * 
 * Author: moicad debug system
 * Updated: 2026-01-26
 */

import { parseOpenSCAD } from '../../backend/scad-parser.js';

/**
 * Test range parsing with various OpenSCAD range syntax patterns
 */
function testRangeParsing() {
  console.log('🔍 moicad Debug: Range Parser Testing');
  console.log('=' .repeat(50));
  
  const testCases = [
    {
      name: 'Basic Range',
      code: '[0:10]',
      description: 'Simple array range from 0 to 10'
    },
    {
      name: 'Variable Assignment',
      code: 'i = [0:10]',
      description: 'Range assigned to variable'
    },
    {
      name: 'For Loop Range',
      code: 'for (i = [0:10])',
      description: 'For loop using range syntax'
    },
    {
      name: 'Stepped Range',
      code: '[0:2:10]',
      description: 'Range with step value'
    },
    {
      name: 'Negative Range',
      code: '[-5:5]',
      description: 'Range with negative values'
    },
    {
      name: 'Single Element Range',
      code: '[5:5]',
      description: 'Range with single element'
    }
  ];
  
  let passCount = 0;
  let failCount = 0;
  
  for (const test of testCases) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`📝 Code: ${test.code}`);
    console.log(`💡 Description: ${test.description}`);
    console.log('-'.repeat(40));
    
    try {
      const result = parseOpenSCAD(test.code);
      
      if (result.success) {
        console.log('✅ Parse Status: SUCCESS');
        console.log('🌳 AST Structure:');
        console.log(JSON.stringify(result.ast, null, 2));
        passCount++;
      } else {
        console.log('❌ Parse Status: FAILED');
        console.log('🚨 Errors:', result.errors);
        failCount++;
      }
    } catch (error) {
      console.log('💥 Parse Status: EXCEPTION');
      console.log('🚨 Error:', error.message);
      failCount++;
    }
    
    console.log('=' .repeat(50));
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📈 Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRangeParsing();
}

export { testRangeParsing };