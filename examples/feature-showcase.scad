/*
 * moicad Feature Showcase
 * Demonstrates all supported OpenSCAD language features
 */

// ===========================================
// 1. Variables
// ===========================================
base_size = 10;
scale_factor = 1.5;

// ===========================================
// 2. Functions
// ===========================================
function double(x) = x * 2;
function add(a, b) = a + b;

// Using functions in expressions
calculated = double(5) + add(3, 7);  // = 20

// ===========================================
// 3. Modules
// ===========================================
module simple_box(size) {
    cube(size);
}

module positioned_cube(x, y, z, size) {
    translate([x, y, z])
        cube(size);
}

// ===========================================
// 4. Conditional (if/else)
// ===========================================
use_sphere = false;

if (use_sphere) {
    sphere(10);
} else {
    cube(10);
}

// ===========================================
// 5. Expressions
// ===========================================

// Arithmetic
sum = 10 + 5;          // 15
product = 10 * 2;      // 20

// Comparison
is_large = sum > 10;   // true

// Ternary operator
choice = is_large ? 20 : 5;  // 20

// ===========================================
// 6. Built-in Math Functions
// ===========================================
abs_value = abs(-10);       // 10
square_root = sqrt(16);     // 4
power = pow(2, 3);          // 8
minimum = min(5, 10, 3);    // 3

// Trigonometry (in degrees)
angle = 30;
sine = sin(angle);          // 0.5

// ===========================================
// 7. Real Example: Parametric Box
// ===========================================
module hollow_box(outer, wall) {
    inner = outer - wall * 2;

    difference() {
        cube(outer);
        translate([wall, wall, wall])
            cube(inner);
    }
}

// Create the box
translate([30, 0, 0])
    hollow_box(outer=20, wall=2);

// ===========================================
// 8. For Loop
// ===========================================
for (i = [0 : 2]) {
    translate([i * 25, 30, 0])
        cube(5);
}

// ===========================================
// 9. Module with Transformation Children
// ===========================================
module shell(size) {
    difference() {
        cube(size);
        translate([1, 1, 1])
            cube(size - 2);
    }
}

translate([0, 60, 0])
    shell(15);
