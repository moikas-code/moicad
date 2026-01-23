/*
 * moicad - Advanced OpenSCAD Features Demo
 *
 * This file demonstrates all the newly implemented language features:
 * - Variables and expressions
 * - User-defined functions
 * - User-defined modules
 * - Conditional statements (if/else)
 * - All operators (arithmetic, logical, ternary)
 * - Built-in math functions
 */

// ========================================
// Variables & Expressions
// ========================================

base_size = 10;
multiplier = 1.5;
calculated_size = base_size * multiplier + 2;  // = 17

// ========================================
// Functions
// ========================================

// Simple function
function double(x) = x * 2;

// Function with multiple parameters
function calculate_volume(w, h, d) = w * h * d;

// Function using built-in math
function hypotenuse(a, b) = sqrt(pow(a, 2) + pow(b, 2));

// Function with ternary operator
function clamp(val, minimum, maximum) =
    val < minimum ? minimum : (val > maximum ? maximum : val);

// ========================================
// Modules
// ========================================

// Simple module
module rounded_cube(size, center_it) {
    // This is simplified - just a cube for now
    cube(size);
}

// Module with transformations
module positioned_sphere(x, y, z, radius) {
    translate([x, y, z])
        sphere(radius);
}

// Complex module using other operations
module hollow_box(outer_size, wall_thickness) {
    inner_size = outer_size - wall_thickness * 2;

    difference() {
        cube(outer_size);
        translate([wall_thickness, wall_thickness, wall_thickness])
            cube(inner_size);
    }
}

// Module using conditionals
module conditional_shape(use_cube, size) {
    if (use_cube) {
        cube(size);
    } else {
        sphere(size / 2);
    }
}

// ========================================
// Conditional Statements
// ========================================

enable_demo_1 = true;
enable_demo_2 = false;

if (enable_demo_1) {
    // Demo 1: Basic shapes
    translate([0, 0, 0])
        cube(10);
}

if (enable_demo_2) {
    translate([20, 0, 0])
        sphere(5);
} else {
    // This branch executes
    translate([20, 0, 0])
        cylinder(r=4, h=10);
}

// ========================================
// Operators Demo
// ========================================

// Arithmetic
a = 10 + 5;     // = 15
b = 10 - 5;     // = 5
c = 10 * 5;     // = 50
d = 10 / 5;     // = 2
e = 10 % 3;     // = 1

// Comparison
is_equal = (a == 15);          // true
is_greater = (a > 10);         // true
is_less_or_equal = (b <= 5);   // true

// Logical
both_true = is_equal && is_greater;  // true
either_true = is_equal || false;     // true
negated = !false;                     // true

// Ternary operator
size_choice = is_equal ? 20 : 10;    // 20

// ========================================
// Built-in Math Functions Demo
// ========================================

// Basic math
abs_val = abs(-5);           // 5
ceiling = ceil(4.3);         // 5
flooring = floor(4.7);       // 4
rounded = round(4.5);        // 5

// Advanced math
square_root = sqrt(16);      // 4
power = pow(2, 3);           // 8
minimum = min(5, 10, 3);     // 3
maximum = max(5, 10, 3);     // 10

// Trigonometry (degrees)
sine_30 = sin(30);           // 0.5
cosine_60 = cos(60);         // 0.5
tangent_45 = tan(45);        // 1.0

// ========================================
// Real-World Example: Parametric Keycap
// ========================================

module keycap(
    base_width,
    top_width,
    height,
    wall_thickness
) {
    // Calculate dimensions
    width_diff = base_width - top_width;
    inner_base = base_width - wall_thickness * 2;
    inner_top = top_width - wall_thickness * 2;

    difference() {
        // Outer shell
        cube([base_width, base_width, height]);

        // Hollow interior
        translate([wall_thickness, wall_thickness, wall_thickness])
            cube([inner_base, inner_base, height]);
    }
}

// Create a keycap
translate([40, 0, 0])
    keycap(
        base_width = 18,
        top_width = 12,
        height = 8,
        wall_thickness = 1.5
    );

// ========================================
// For Loop Demo
// ========================================

for (i = [0 : 3]) {
    translate([i * 15, 30, 0])
        cube(5 + i * 2);
}

// For loop with step
for (angle = [0 : 45 : 315]) {
    rotate_val = angle;
    translate([0, 60, 0])
        rotate(rotate_val)
            translate([10, 0, 0])
                cube(3);
}
