export default [
  // Variables and assignments
  {
    name: 'Variable - Simple assignment',
    code: 'size = 10; cube(size);',
    expectedType: 'success'
  },
  {
    name: 'Variable - Multiple variables',
    code: 'width = 20; height = 15; depth = 10; cube([width, height, depth]);',
    expectedType: 'success'
  },
  {
    name: 'Variable - Variable expression',
    code: 'base = 8; expanded = base * 1.5; cube(expanded);',
    expectedType: 'success'
  },
  {
    name: 'Variable - Variable reuse',
    code: 'radius = 12; sphere(radius); translate([radius*2, 0, 0]) sphere(radius);',
    expectedType: 'success'
  },
  {
    name: 'Variable - Complex expression',
    code: 'size = 10; pos = size * 2 + 5; scale_factor = 1.5; final_size = size * scale_factor; translate([pos, 0, 0]) cube(final_size);',
    expectedType: 'success'
  },
  
  // Functions
  {
    name: 'Function - Simple function',
    code: 'function double(x) = x * 2; cube(double(5));',
    expectedType: 'success'
  },
  {
    name: 'Function - Multiple parameters',
    code: 'function box_size(w, h, d) = [w, h, d]; cube(box_size(10, 20, 15));',
    expectedType: 'success'
  },
  {
    name: 'Function - Math function',
    code: 'function area(r) = 3.14159 * r * r; function cylinder_volume(r, h) = area(r) * h; cylinder(5, cylinder_volume(5, 20) / area(5));',
    expectedType: 'success'
  },
  {
    name: 'Function - Recursive function',
    code: 'function factorial(n) = n <= 1 ? 1 : n * factorial(n - 1); cube(factorial(3));',
    expectedType: 'success'
  },
  {
    name: 'Function - Function with built-ins',
    code: 'function distance(x, y) = sqrt(x*x + y*y); translate([distance(3, 4), 0, 0]) cube(10);',
    expectedType: 'success'
  },
  
  // Modules
  {
    name: 'Module - Simple module',
    code: 'module box(w, h, d) { cube([w, h, d]); } box(10, 20, 15);',
    expectedType: 'success'
  },
  {
    name: 'Module - Module with transformations',
    code: 'module positioned_cube(size, pos) { translate(pos) cube(size); } positioned_cube(8, [10, 5, 0]);',
    expectedType: 'success'
  },
  {
    name: 'Module - Complex module',
    code: 'module bracket(width, height, thickness) { difference() { cube([width, height, thickness]); translate([thickness, thickness, -1]) cube([width-thickness*2, height-thickness*2, thickness+2]); } } bracket(30, 40, 5);',
    expectedType: 'success'
  },
  {
    name: 'Module - Module with children',
    code: 'module rotate_copy(angle, copies) { for (i = [0:copies-1]) rotate([0, 0, angle*i]) children(); } rotate_copy(120, 3) translate([20, 0, 0]) cube(5);',
    expectedType: 'success'
  },
  {
    name: 'Module - Nested modules',
    code: 'module leg(height) { cylinder(2, height); } module table(width, depth, height) { cube([width, depth, 5]); translate([2, 2, -height]) leg(height); translate([width-2, 2, -height]) leg(height); translate([2, depth-2, -height]) leg(height); translate([width-2, depth-2, -height]) leg(height); } table(40, 30, 20);',
    expectedType: 'success'
  },
  
  // If/Else statements
  {
    name: 'If - Simple if',
    code: 'enable = true; if (enable) { cube(10); }',
    expectedType: 'success'
  },
  {
    name: 'If - If/else',
    code: 'use_sphere = false; if (use_sphere) { sphere(10); } else { cube(10); }',
    expectedType: 'success'
  },
  {
    name: 'If - Complex condition',
    code: 'size = 15; if (size > 10 && size < 20) { cube(size); } else { sphere(size/2); }',
    expectedType: 'success'
  },
  {
    name: 'If - Nested if',
    code: 'type = "box"; size = 8; if (type == "box") { if (size > 5) { cube(size); } else { cube(5); } } else { sphere(size); }',
    expectedType: 'success'
  },
  {
    name: 'If - If with expressions',
    code: 'condition = true; value = condition ? 20 : 10; if (value > 15) { cube(value); }',
    expectedType: 'success'
  },
  
  // For loops
  {
    name: 'For - Simple range',
    code: 'for (i = [0:4]) { translate([i*10, 0, 0]) cube(8); }',
    expectedType: 'success'
  },
  {
    name: 'For - Range with step',
    code: 'for (i = [0:10:30]) { translate([i, 0, 0]) sphere(5); }',
    expectedType: 'success'
  },
  {
    name: 'For - List iteration',
    code: 'sizes = [5, 10, 15, 20]; for (size = sizes) { cube(size); }',
    expectedType: 'success'
  },
  {
    name: 'For - Nested loops',
    code: 'for (x = [0:2]) { for (y = [0:2]) { translate([x*15, y*15, 0]) cube(10); } }',
    expectedType: 'success'
  },
  {
    name: 'For - Loop with transformations',
    code: 'for (angle = [0:45:315]) { rotate([0, 0, angle]) translate([20, 0, 0]) cube([8, 4, 10]); }',
    expectedType: 'success'
  },
  
  // Let statements
  {
    name: 'Let - Simple let',
    code: 'let(width = 20) cube(width);',
    expectedType: 'success'
  },
  {
    name: 'Let - Multiple bindings',
    code: 'let(w = 15, h = 25, d = 10) cube([w, h, d]);',
    expectedType: 'success'
  },
  {
    name: 'Let - Let with expressions',
    code: 'let(base = 8, expanded = base * 2, offset = expanded/2) translate([offset, 0, 0]) cube(expanded);',
    expectedType: 'success'
  },
  {
    name: 'Let - Let with complex scope',
    code: 'size = 10; let(local_size = size * 2) { cube(local_size); } cube(size);',
    expectedType: 'success'
  },
  
  // List comprehensions
  {
    name: 'List Comprehension - Simple range',
    code: 'points = [for (i = [0:4]) i * 10]; for (i = [0:len(points)-1]) translate([points[i], 0, 0]) cube(5);',
    expectedType: 'success'
  },
  {
    name: 'List Comprehension - With condition',
    code: 'numbers = [for (i = [0:10]) if (i % 2 == 0) i]; for (num = numbers) translate([num*10, 0, 0]) cube(8);',
    expectedType: 'success'
  },
  {
    name: 'List Comprehension - Complex expression',
    code: 'sizes = [for (x = [0:3]) for (y = [0:2]) sqrt(x*x + y*y)]; for (i = [0:len(sizes)-1]) translate([i*10, 0, 0]) cube(sizes[i] * 5);',
    expectedType: 'success'
  },
  
  // Built-in math functions
  {
    name: 'Math - Basic arithmetic',
    code: 'result = 5 + 3 * 2 - 4 / 2; cube(result);',
    expectedType: 'success'
  },
  {
    name: 'Math - Trigonometry',
    code: 'angle = 45; x = 20 * cos(angle); y = 20 * sin(angle); translate([x, y, 0]) cube(5);',
    expectedType: 'success'
  },
  {
    name: 'Math - Advanced functions',
    code: 'value = sqrt(25) + pow(3, 2) + abs(-5) + ceil(4.2) + floor(4.8) + round(4.5); cube(value);',
    expectedType: 'success'
  },
  {
    name: 'Math - Min/max',
    code: 'size = min(20, max(5, 15)); cube(size);',
    expectedType: 'success'
  },
  
  // Echo and assert
  {
    name: 'Debug - Echo statement',
    code: 'size = 10; echo("Size is", size); cube(size);',
    expectedType: 'success'
  },
  {
    name: 'Debug - Assert true',
    code: 'value = 10; assert(value > 5, "Value should be greater than 5"); cube(value);',
    expectedType: 'success'
  },
  {
    name: 'Debug - Assert false (should fail)',
    code: 'value = 3; assert(value > 5, "Value should be greater than 5"); cube(value);',
    expectedType: 'error'
  },
  
  // Complex combinations
  {
    name: 'Complex - Module with variables and loops',
    code: 'module gear(teeth, radius) { tooth_height = radius * 0.2; for (i = [0:teeth-1]) { rotate([0, 0, i * 360/teeth]) translate([radius, 0, 0]) cube([tooth_height, 2, 5]); } cylinder(radius/2, 5, $fn=teeth); } gear(12, 20);',
    expectedType: 'success'
  },
  {
    name: 'Complex - Function with conditionals',
    code: 'function shape_size(type, base) = type == "small" ? base * 0.5 : type == "large" ? base * 2 : base; for (s = ["small", "medium", "large"]) { translate([shape_size(s, 20), 0, 0]) cube(shape_size(s, 10)); }',
    expectedType: 'success'
  },
  {
    name: 'Complex - Nested control structures',
    code: 'rows = 3; cols = 4; for (x = [0:cols-1]) { for (y = [0:rows-1]) { let(pos_x = x * 15, pos_y = y * 15, size = (x + y) % 2 == 0 ? 8 : 6) { if (size > 6) { translate([pos_x, pos_y, 0]) cube(size); } else { translate([pos_x, pos_y, 0]) sphere(size/2); } } } }',
    expectedType: 'success'
  },
  {
    name: 'Complex - Module with parameters and children',
    code: 'module pattern(rows, cols) { for (i = [0:rows-1]) { for (j = [0:cols-1]) { translate([i*12, j*12, 0]) rotate([0, 0, (i+j)*45]) children(); } } } pattern(3, 3) cube(8);',
    expectedType: 'success'
  }
];