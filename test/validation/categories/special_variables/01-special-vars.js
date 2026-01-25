export default [
  // $fn - Fragment number
  {
    name: '$fn - Default sphere',
    code: 'sphere(10);',
    expectedType: 'success'
  },
  {
    name: '$fn - High detail sphere',
    code: 'sphere(10, $fn=32);',
    expectedType: 'success'
  },
  {
    name: '$fn - Very high detail',
    code: 'sphere(10, $fn=64);',
    expectedType: 'success'
  },
  {
    name: '$fn - Low detail',
    code: 'sphere(10, $fn=8);',
    expectedType: 'success'
  },
  {
    name: '$fn - Cylinder with $fn',
    code: 'cylinder(8, 20, $fn=24);',
    expectedType: 'success'
  },
  {
    name: '$fn - Circle with $fn',
    code: 'circle(15, $fn=16);',
    expectedType: 'success'
  },
  {
    name: '$fn - Global $fn setting',
    code: '$fn = 48; sphere(12); cylinder(6, 18);',
    expectedType: 'success'
  },
  {
    name: '$fn - Override global $fn',
    code: '$fn = 16; sphere(8); cylinder(10, 15, $fn=32); sphere(6);',
    expectedType: 'success'
  },
  {
    name: '$fn - Rotate extrude with $fn',
    code: 'rotate_extrude($fn=32) translate([20, 0]) circle(8, $fn=16);',
    expectedType: 'success'
  },
  {
    name: '$fn - Polygon with circular approximation',
    code: 'function circle_polygon(r, fn) = [for (i = [0:fn-1]) [r*cos(360*i/fn), r*sin(360*i/fn)]]; polygon(circle_polygon(15, 20));',
    expectedType: 'success'
  },
  
  // $fa - Fragment angle
  {
    name: '$fa - Default behavior',
    code: 'sphere(15);',
    expectedType: 'success'
  },
  {
    name: '$fa - Small fragment angle',
    code: 'sphere(15, $fa=5);',
    expectedType: 'success'
  },
  {
    name: '$fa - Very small fragment angle',
    code: 'sphere(15, $fa=1);',
    expectedType: 'success'
  },
  {
    name: '$fa - Large fragment angle',
    code: 'sphere(15, $fa=30);',
    expectedType: 'success'
  },
  {
    name: '$fa - Cylinder with $fa',
    code: 'cylinder(10, 25, $fa=10);',
    expectedType: 'success'
  },
  {
    name: '$fa - Global $fa setting',
    code: '$fa = 8; sphere(20); cylinder(8, 30);',
    expectedType: 'success'
  },
  {
    name: '$fa - Combined with $fn',
    code: 'sphere(12, $fa=5, $fn=24);',
    expectedType: 'success'
  },
  
  // $fs - Fragment size
  {
    name: '$fs - Default behavior',
    code: 'sphere(20);',
    expectedType: 'success'
  },
  {
    name: '$fs - Small fragment size',
    code: 'sphere(20, $fs=0.5);',
    expectedType: 'success'
  },
  {
    name: '$fs - Very small fragment size',
    code: 'sphere(20, $fs=0.1);',
    expectedType: 'success'
  },
  {
    name: '$fs - Large fragment size',
    code: 'sphere(20, $fs=5);',
    expectedType: 'success'
  },
  {
    name: '$fs - Cylinder with $fs',
    code: 'cylinder(12, 30, $fs=1);',
    expectedType: 'success'
  },
  {
    name: '$fs - Global $fs setting',
    code: '$fs = 2; sphere(25); cylinder(10, 35);',
    expectedType: 'success'
  },
  
  // $t - Animation time
  {
    name: '$t - Animation variable',
    code: 'translate([$t * 10, 0, 0]) cube(8);',
    expectedType: 'success'
  },
  {
    name: '$t - Rotation animation',
    code: 'rotate([0, 0, $t * 360]) translate([15, 0, 0]) cube(6);',
    expectedType: 'success'
  },
  {
    name: '$t - Scale animation',
    code: 'scale(1 + $t * 0.5) sphere(10);',
    expectedType: 'success'
  },
  {
    name: '$t - Complex animation',
    code: 'translate([$t * 20, 0, 0]) rotate([0, 0, $t * 180]) scale(1 + sin($t * 360) * 0.3) cube(10);',
    expectedType: 'success'
  },
  {
    name: '$t - Conditional animation',
    code: 'if ($t < 0.5) { translate([$t * 30, 0, 0]) cube(8); } else { translate([(1-$t) * 30, 0, 0]) sphere(8); }',
    expectedType: 'success'
  },
  {
    name: '$t - Animation in module',
    code: 'module animated_part() { translate([$t * 15, 0, 0]) cylinder(5, 10); rotate([0, 0, $t * 90]) translate([10, 0, 0]) cube(6); } animated_part();',
    expectedType: 'success'
  },
  {
    name: '$t - Oscillating animation',
    code: 'translate([sin($t * 360) * 15, cos($t * 360) * 15, 0]) sphere(6);',
    expectedType: 'success'
  },
  
  // Special variables in complex scenarios
  {
    name: 'Special vars - All together',
    code: '$fn = 24; $fa = 6; $fs = 1; sphere(15);',
    expectedType: 'success'
  },
  {
    name: 'Special vars - Override precedence',
    code: '$fn = 16; $fa = 5; $fs = 2; sphere(12, $fn=32, $fa=3, $fs=0.5);',
    expectedType: 'success'
  },
  {
    name: 'Special vars - In loops',
    code: '$fn = 12; for (i = [0:4]) { translate([i * 15, 0, 0]) sphere(8); }',
    expectedType: 'success'
  },
  {
    name: 'Special vars - In modules',
    code: 'module detailed_part(size) { $fn = 32; sphere(size); cylinder(size/2, size*2); } detailed_part(10);',
    expectedType: 'success'
  },
  {
    name: 'Special vars - Animation with detail',
    code: '$fn = 36; translate([cos($t * 360) * 20, sin($t * 360) * 20, 0]) sphere(8);',
    expectedType: 'success'
  },
  
  // Performance with special variables
  {
    name: 'Performance - High detail animation',
    code: '$fn = 64; translate([$t * 25, 0, 0]) sphere(12);',
    expectedType: 'success'
  },
  {
    name: 'Performance - Many objects with $fn',
    code: '$fn = 16; for (i = [0:9]) { translate([i * 8, 0, 0]) sphere(5); }',
    expectedType: 'success'
  },
  {
    name: 'Performance - Complex shape with special vars',
    code: '$fn = 24; $fa = 8; $fs = 1.5; difference() { sphere(20); for (angle = [0:60:300]) { rotate([0, 0, angle]) translate([15, 0, -5]) cylinder(3, 30); } }',
    expectedType: 'success'
  },
  
  // Edge cases and error handling
  {
    name: '$fn - Zero fragments',
    code: 'sphere(10, $fn=0);',
    expectedType: 'error' // Should fail
  },
  {
    name: '$fn - Negative fragments',
    code: 'sphere(10, $fn=-8);',
    expectedType: 'error' // Should fail
  },
  {
    name: '$fa - Zero angle',
    code: 'sphere(10, $fa=0);',
    expectedType: 'error' // Should fail
  },
  {
    name: '$fa - Negative angle',
    code: 'sphere(10, $fa=-5);',
    expectedType: 'error' // Should fail
  },
  {
    name: '$fs - Zero size',
    code: 'sphere(10, $fs=0);',
    expectedType: 'error' // Should fail
  },
  {
    name: '$fs - Negative size',
    code: 'sphere(10, $fs=-1);',
    expectedType: 'error' // Should fail
  },
  {
    name: '$t - Animation boundary values',
    code: 'if ($t == 0) { cube(10); } else if ($t == 1) { sphere(10); } else { cylinder(5, 10); }',
    expectedType: 'success'
  },
  
  // Special variables with transformations
  {
    name: 'Special vars + Transform - Rotated high detail',
    code: 'rotate([45, 30, 60]) sphere(15, $fn=48);',
    expectedType: 'success'
  },
  {
    name: 'Special vars + Transform - Scaled with $fa',
    code: 'scale(2) sphere(10, $fa=4);',
    expectedType: 'success'
  },
  {
    name: 'Special vars + Transform - Animated transformation',
    code: 'rotate([0, 0, $t * 180]) translate([15, 0, 0]) sphere(8, $fn=24);',
    expectedType: 'success'
  },
  
  // Special variables with boolean operations
  {
    name: 'Special vars + Boolean - High detail union',
    code: '$fn = 32; union() { sphere(15); cylinder(8, 30); }',
    expectedType: 'success'
  },
  {
    name: 'Special vars + Boolean - Animated difference',
    code: 'difference() { cube(30, center=true); translate([$t * 10, 0, 0]) sphere(12, $fn=24); }',
    expectedType: 'success'
  },
  {
    name: 'Special vars + Boolean - Complex detail control',
    code: '$fa = 6; $fs = 1; difference() { sphere(25); union() { sphere(15, $fn=16); rotate([90, 0, 0]) cylinder(10, 50, $fn=24); } }',
    expectedType: 'success'
  },
  
  // Integration tests
  {
    name: 'Integration - Complete animation system',
    code: '$fn = 24; module animated_system() { // Rotating planets translate([0, 0, 0]) sphere(8, $fn=16); // Planet 1 rotate([0, 0, $t * 120]) translate([20, 0, 0]) sphere(5, $fn=12); // Planet 2 rotate([0, 0, $t * 60]) translate([35, 0, 0]) sphere(6, $fn=14); // Moon rotate([0, 0, $t * 240]) translate([35, 0, 0]) rotate([0, 0, $t * 720]) translate([10, 0, 0]) sphere(2, $fn=8); } animated_system();',
    expectedType: 'success'
  },
  {
    name: 'Integration - Gear with special variables',
    code: '$fn = 48; module gear(teeth, radius) { tooth_height = radius * 0.15; difference() { cylinder(radius, 5, $fn=teeth); for (i = [0:teeth-1]) { rotate([0, 0, i * 360/teeth + 180/teeth]) translate([radius * 0.7, 0, -1]) cylinder(tooth_height/3, 7, $fn=8); } } for (i = [0:teeth-1]) { rotate([0, 0, i * 360/teeth]) translate([radius - tooth_height/2, 0, 0]) cube([tooth_height, tooth_height * 0.6, 6], center=true); } } gear(12, 20);',
    expectedType: 'success'
  }
];