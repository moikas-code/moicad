/**
 * Language Detection for moicad
 *
 * Auto-detects whether code is OpenSCAD or JavaScript
 */

export type Language = 'openscad' | 'javascript';

/**
 * Detect the language of the provided code
 *
 * JavaScript indicators:
 * - import/export statements
 * - const/let/var declarations
 * - => arrow functions
 * - Shape. API calls
 * - JavaScript keywords: async, await, class, extends
 *
 * OpenSCAD indicators:
 * - cube(), sphere(), cylinder() without Shape. prefix
 * - module/function keywords
 * - OpenSCAD-specific syntax: $fn, #, %, !, *
 */
export function detectLanguage(code: string): Language {
  // Trim and normalize whitespace
  const normalizedCode = code.trim();

  if (!normalizedCode) {
    return 'openscad'; // Default to OpenSCAD for empty code
  }

  // Strong JavaScript indicators (high confidence)
  const jsStrongIndicators = [
    /^\s*import\s+/m,                    // import statement
    /^\s*export\s+(default|const|let|var|function|class)/m, // export statement
    /=>/,                                 // arrow function
    /\bconst\s+\w+\s*=/,                 // const declaration
    /\blet\s+\w+\s*=/,                   // let declaration
    /\bShape\./,                         // Shape. API call
    /\bclass\s+\w+/,                     // class declaration
    /\basync\s+function/,                // async function
    /\bawait\s+/,                        // await keyword
  ];

  // Count strong JavaScript indicators
  let jsScore = 0;
  for (const pattern of jsStrongIndicators) {
    if (pattern.test(normalizedCode)) {
      jsScore += 2; // Strong indicators worth 2 points
    }
  }

  // Weak JavaScript indicators (medium confidence)
  const jsWeakIndicators = [
    /\bvar\s+\w+\s*=/,                   // var declaration (could be SCAD variable)
    /\bfunction\s+\w+\s*\(/,             // function keyword (SCAD also has this)
    /\.\w+\(/,                           // method calls like .translate()
  ];

  for (const pattern of jsWeakIndicators) {
    if (pattern.test(normalizedCode)) {
      jsScore += 1; // Weak indicators worth 1 point
    }
  }

  // OpenSCAD-specific indicators
  const scadIndicators = [
    /^\s*module\s+\w+/m,                 // module declaration
    /^\s*(cube|sphere|cylinder|cone|circle|square|polygon|polyhedron|text)\s*\(/m, // primitives without Shape.
    /\$fn\b|\$fa\b|\$fs\b|\$t\b/,       // special variables
    /^\s*[#%!*]/m,                       // OpenSCAD modifiers
    /\bunion\s*\(\)\s*\{/,               // union() { } syntax
    /\bdifference\s*\(\)\s*\{/,          // difference() { } syntax
    /\bintersection\s*\(\)\s*\{/,        // intersection() { } syntax
    /\bfor\s*\(\s*\w+\s*=\s*\[/,        // for loop with range
  ];

  let scadScore = 0;
  for (const pattern of scadIndicators) {
    if (pattern.test(normalizedCode)) {
      scadScore += 2; // OpenSCAD indicators worth 2 points
    }
  }

  // Decision logic
  // If JavaScript score is high, it's JavaScript
  if (jsScore >= 4) {
    return 'javascript';
  }

  // If OpenSCAD score is high and JS score is low, it's OpenSCAD
  if (scadScore >= 2 && jsScore < 2) {
    return 'openscad';
  }

  // If we see Shape. API, it's definitely JavaScript
  if (/\bShape\./m.test(normalizedCode)) {
    return 'javascript';
  }

  // If we see import/export, it's definitely JavaScript
  if (/^\s*(import|export)\s+/m.test(normalizedCode)) {
    return 'javascript';
  }

  // Default to OpenSCAD (backwards compatibility)
  return 'openscad';
}

/**
 * Test the language detector with various code samples
 */
export function testLanguageDetector() {
  const tests = [
    { code: 'cube(10);', expected: 'openscad' },
    { code: 'import { Shape } from "moicad";\nexport default Shape.cube(10);', expected: 'javascript' },
    { code: 'const s = Shape.sphere(5);', expected: 'javascript' },
    { code: 'sphere(5, $fn=32);', expected: 'openscad' },
    { code: 'module bolt() { cube(10); }', expected: 'openscad' },
    { code: 'function test() { return 5; }', expected: 'openscad' },
    { code: 'const test = () => 5;', expected: 'javascript' },
    { code: 'union() { cube(10); sphere(5); }', expected: 'openscad' },
    { code: 'Shape.union(Shape.cube(10), Shape.sphere(5))', expected: 'javascript' },
    { code: '#cube(10);', expected: 'openscad' },
  ];

  console.log('Language Detector Tests:');
  let passed = 0;
  for (const test of tests) {
    const detected = detectLanguage(test.code);
    const success = detected === test.expected;
    if (success) passed++;
    console.log(`  ${success ? '✅' : '❌'} "${test.code.substring(0, 40)}..." => ${detected} (expected: ${test.expected})`);
  }
  console.log(`\nPassed: ${passed}/${tests.length}`);
}
