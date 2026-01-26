// OpenSCAD Primitive Solids Compatibility Test
// This file tests the newly implemented features

// Test 1: Resolution with $fn
translate([0, 0, 0]) sphere(r=10, $fn=10);

// Test 2: Resolution with $fa and $fs
translate([25, 0, 0]) sphere(r=10, $fa=5, $fs=0.1);

// Test 3: Global resolution variables
$fn = 20;
translate([50, 0, 0]) sphere(r=10);

// Test 4: Square with center=false (default)
translate([0, 25, 0]) square(10, center=false);

// Test 5: Square with center=true
translate([25, 25, 0]) square(10, center=true);

// Test 6: Cylinder with resolution
translate([0, 50, 0]) cylinder(h=20, r=5, $fn=8);

// Test 7: Circle with resolution
translate([25, 50, 0]) circle(r=5, $fa=10, $fs=0.5);

// Test 8: Text with alignment parameters (parsed but not yet applied)
translate([0, 75, 0]) text("Test", size=10, halign="center", valign="center");
