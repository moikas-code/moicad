export default [
  // Text primitive (if implemented)
  {
    name: 'Text - Simple text',
    code: 'text("Hello", size=10);',
    expectedType: 'success'
  },
  {
    name: 'Text - Text with font',
    code: 'text("OpenSCAD", size=12, font="Arial");',
    expectedType: 'success'
  },
  {
    name: 'Text - Text with spacing',
    code: 'text("WIDE", size=8, spacing=2);',
    expectedType: 'success'
  },
  {
    name: 'Text - Extruded text',
    code: 'linear_extrude(5) text("3D", size=15);',
    expectedType: 'success'
  },
  {
    name: 'Text - Text in module',
    code: 'module label(txt) { linear_extrude(2) text(txt, size=8); } label("Test");',
    expectedType: 'success'
  },
  
  // Color operations
  {
    name: 'Color - Simple color',
    code: 'color([1, 0, 0]) cube(10);',
    expectedType: 'success'
  },
  {
    name: 'Color - Named color',
    code: 'color("red") sphere(8);',
    expectedType: 'success'
  },
  {
    name: 'Color - RGB with alpha',
    code: 'color([0.2, 0.8, 0.2, 0.7]) cylinder(6, 15);',
    expectedType: 'success'
  },
  {
    name: 'Color - Hex color',
    code: 'color("#FF0000") cube(12);',
    expectedType: 'success'
  },
  {
    name: 'Color - Multiple colors',
    code: 'union() { color([1, 0, 0]) cube(10); color([0, 1, 0]) translate([12, 0, 0]) cube(10); color([0, 0, 1]) translate([24, 0, 0]) cube(10); }',
    expectedType: 'success'
  },
  {
    name: 'Color - Nested colors',
    code: 'color([1, 1, 0]) { difference() { cube(15); color([0, 0, 1]) translate([5, 5, -1]) cylinder(3, 17); } }',
    expectedType: 'success'
  },
  
  // Visualization modifiers
  {
    name: 'Modifier - Debug modifier (!)',
    code: '!cube(10);',
    expectedType: 'success'
  },
  {
    name: 'Modifier - Background modifier (%)',
    code: '%cube(20);',
    expectedType: 'success'
  },
  {
    name: 'Modifier - Transparent modifier (#)',
    code: '#sphere(12);',
    expectedType: 'success'
  },
  {
    name: 'Modifier - Disable modifier (*)',
    code: '*cylinder(8, 15);',
    expectedType: 'success'
  },
  {
    name: 'Modifier - Multiple modifiers',
    code: 'union() { !cube(10); %translate([15, 0, 0]) sphere(8); #translate([30, 0, 0]) cylinder(6, 12); }',
    expectedType: 'success'
  },
  {
    name: 'Modifier - Modifier with boolean',
    code: 'difference() { cube(20); !translate([10, 10, 0]) cylinder(5, 25); }',
    expectedType: 'success'
  },
  {
    name: 'Modifier - Complex modifier usage',
    code: 'module assembly() { color([1, 0, 0]) !cube(15); color([0, 1, 0]) %translate([10, 10, 0]) sphere(8); color([0, 0, 1]) #translate([-5, -5, 0]) cylinder(4, 20); } assembly();',
    expectedType: 'success'
  },
  
  // Import operations (if implemented)
  {
    name: 'Import - Basic import',
    code: 'import("test.stl");',
    expectedType: 'success'
  },
  {
    name: 'Import - Import with transformation',
    code: 'translate([10, 0, 0]) import("test.obj");',
    expectedType: 'success'
  },
  {
    name: 'Import - Include file',
    code: 'include("lib.scad"); cube(10);',
    expectedType: 'success'
  },
  {
    name: 'Import - Use module',
    code: 'use("parts.scad"); imported_module();',
    expectedType: 'success'
  },
  
  // Complex combinations of advanced features
  {
    name: 'Advanced - Colored text assembly',
    code: 'module colored_text(txt, col) { color(col) linear_extrude(3) text(txt, size=10); } union() { colored_text("RED", [1, 0, 0]); colored_text("GREEN", [0, 1, 0]); colored_text("BLUE", [0, 0, 1]); }',
    expectedType: 'success'
  },
  {
    name: 'Advanced - Modifier with color',
    code: 'color([0.8, 0.2, 0.2]) { !cube(20); %translate([10, 10, 0]) sphere(10); }',
    expectedType: 'success'
  },
  {
    name: 'Advanced - Complex assembly with modifiers',
    code: 'module machine_part() { difference() { color([0.7, 0.7, 0.7]) cube([30, 20, 10]); color([1, 0, 0]) !translate([5, 5, -1]) cylinder(3, 12); color([0, 0, 1]) #translate([25, 15, -1]) cylinder(2, 12); } %color([0, 1, 0, 0.5]) translate([15, 10, 5]) sphere(8); } machine_part();',
    expectedType: 'success'
  },
  
  // Edge cases for advanced features
  {
    name: 'Color - Invalid color values',
    code: 'color([2, -1, 1.5]) cube(10);',
    expectedType: 'success' // Should handle gracefully
  },
  {
    name: 'Color - Empty color',
    code: 'color([]) cube(10);',
    expectedType: 'error' // Should fail
  },
  {
    name: 'Text - Empty string',
    code: 'text("");',
    expectedType: 'success' // Should handle gracefully
  },
  {
    name: 'Text - Very large text',
    code: 'text("HUGE", size=100);',
    expectedType: 'success'
  },
  {
    name: 'Modifier - Modifier on empty geometry',
    code: '!difference() { cube(10); translate([0, 0, 0]) cube(10); }',
    expectedType: 'success'
  },
  
  // Performance and stress tests
  {
    name: 'Performance - Many colored objects',
    code: 'for (i = [0:19]) { color([i/20, 0.5, 1-i/20]) translate([i*5, 0, 0]) cube(4); }',
    expectedType: 'success'
  },
  {
    name: 'Performance - Complex modifiers',
    code: 'union() { for (i = [0:9]) { color([0.1*i, 0.5, 0.5]) if (i % 2 == 0) !translate([i*8, 0, 0]) cube(6); else #translate([i*8, 0, 0]) sphere(4); } }',
    expectedType: 'success'
  },
  {
    name: 'Performance - Large text assembly',
    code: 'for (i = [0:4]) { color([0.2, 0.2*i, 0.8]) translate([0, i*15, 0]) linear_extrude(2) text("Line", size=8); }',
    expectedType: 'success'
  },
  
  // Integration tests
  {
    name: 'Integration - Full feature combination',
    code: 'module complex_assembly() { // Variables and color variables = [10, 15, 20]; colors = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; // Colored components for (i = [0:2]) { color(colors[i]) { // Different modifiers based on index if (i == 0) !translate([variables[i], 0, 0]) cube(variables[i]); else if (i == 1) %translate([variables[i], 0, 0]) sphere(variables[i]/2); else #translate([variables[i], 0, 0]) cylinder(variables[i]/3, variables[i]); } } // Text label color([0.5, 0.5, 0.5]) translate([0, -10, 0]) linear_extrude(1) text("Assembly", size=8); } complex_assembly();',
    expectedType: 'success'
  },
  {
    name: 'Integration - Module with all features',
    code: 'module feature_rich_part(size, label, main_color) { // Main part with color color(main_color) cube(size); // Modifier features !translate([0, 0, size]) cylinder(size/4, size/2); %translate([size, 0, 0]) sphere(size/3); // Cutout with different color color([1, 1, 1]) difference() { translate([size/2, size/2, -1]) cylinder(size/6, size+2); } // Text label if (label != "") { color([0, 0, 0]) translate([size/2, -size/4, size]) linear_extrude(2) text(label, size=size/8); } } feature_rich_part(20, "TEST", [0.8, 0.4, 0.2]);',
    expectedType: 'success'
  }
];