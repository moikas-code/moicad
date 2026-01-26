#!/usr/bin/env node

/**
 * moicad Debug Utility - String Parser
 * 
 * Purpose: Character-level analysis of problematic strings
 * Useful for debugging tokenizer issues with specific characters
 * 
 * Usage: node scripts/debug/string-parser.js
 * 
 * Features:
 * - Character-by-character breakdown
 * - Unicode/ASCII code analysis
 * - Whitespace and special character identification
 * 
 * Author: moicad debug system
 * Updated: 2026-01-26
 */

/**
 * Analyze string character by character
 * @param {string} str - String to analyze
 * @param {string} description - Description of what's being analyzed
 */
function analyzeString(str, description) {
  console.log(`\n🔍 Analyzing: "${str}"`);
  console.log(`💡 Purpose: ${description}`);
  console.log(`📏 Length: ${str.length} characters`);
  console.log('-'.repeat(60));
  
  console.log('📝 Character Breakdown:');
  console.log('Idx  Char  ASCII   Binary         Description');
  console.log('---  ----  -----   -------------  -----------');
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);
    const binary = code.toString(2).padStart(8, '0');
    const type = getCharType(char);
    
    console.log(
      i.toString().padStart(3) + '  ' +
      (char === ' ' ? 'SPC' : char).padEnd(4) + '  ' +
      code.toString().padStart(5) + '   ' +
      binary.padEnd(13) + '  ' +
      type
    );
  }
  
  // Analysis summary
  const analysis = analyzeStringProperties(str);
  console.log('\n📊 String Analysis:');
  Object.entries(analysis).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
}

/**
 * Determine character type description
 */
function getCharType(char) {
  if (char >= '0' && char <= '9') return 'Digit';
  if (char >= 'a' && char <= 'z') return 'Lowercase Letter';
  if (char >= 'A' && char <= 'Z') return 'Uppercase Letter';
  if (char === ' ') return 'Space';
  if (char === '\t') return 'Tab';
  if (char === '\n') return 'Newline';
  if ('()[]{};:='.includes(char)) return 'Syntax Character';
  return 'Special Character';
}

/**
 * Analyze string properties
 */
function analyzeStringProperties(str) {
  const properties = {};
  
  properties.digits = (str.match(/[0-9]/g) || []).length;
  properties.letters = (str.match(/[a-zA-Z]/g) || []).length;
  properties.spaces = (str.match(/\s/g) || []).length;
  properties.brackets = (str.match(/[()]/g) || []).length;
  properties.squareBrackets = (str.match(/\[/g) || []).length;
  properties.special = (str.match(/[^a-zA-Z0-9\s\(\)]/g) || []).length;
  properties.controlChars = (str.match(/[\x00-\x1F\x7F]/g) || []).length;
  
  return properties;
}

/**
 * Run string analysis tests
 */
function debugStringParser() {
  console.log('🛠️  moicad Debug: String Parser Testing');
  console.log('=' .repeat(60));
  
  const testStrings = [
    {
      string: '[ for (i = [0:5]) i ]',
      description: 'Complete list comprehension syntax'
    },
    {
      string: 'cube(10); // comment',
      description: 'Function call with comment'
    },
    {
      string: '"Hello, World!"',
      description: 'String literal with special characters'
    },
    {
      string: 'module box(w=10) {}',
      description: 'Module definition with default parameter'
    },
    {
      string: '\tfunction area(r) = PI*r*r;',
      description: 'Function with leading tab'
    }
  ];
  
  testStrings.forEach(test => {
    analyzeString(test.string, test.description);
  });
  
  console.log('\n🎯 String Parser Debug Complete!');
  console.log('💡 Tip: Use for identifying hidden characters or encoding issues');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugStringParser();
}

export { analyzeString, debugStringParser };