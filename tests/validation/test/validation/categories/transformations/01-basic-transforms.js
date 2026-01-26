export default [
  // Translation
  {
    name: 'Translate - Simple X translation',
    code: 'translate([10, 0, 0]) cube(5);',
    expectedType: 'success'
  },
  {
    name: 'Translate - Multi-axis translation',
    code: 'translate([5, 10, 15]) sphere(8);',
    expectedType: 'success'
  },
  {
    name: 'Translate - Negative values',
    code: 'translate([-5, -10, 0]) cube(10);',
    expectedType: 'success'
  },
  
  // Rotation
  {
    name: 'Rotate - Single angle (Z-axis)',
    code: 'rotate(45) cube(10);',
    expectedType: 'success'
  },
  {
    name: 'Rotate - Multi-axis rotation',
    code: 'rotate([45, 30, 60]) cube(8);',
    expectedType: 'success'
  },
  {
    name: 'Rotate - Angle + vector',
    code: 'rotate(45, [1, 1, 0]) cube(10);',
    expectedType: 'success'
  },
  {
    name: 'Rotate - Complex transformation',
    code: 'rotate([0, 0, 45]) translate([10, 0, 0]) cube(5);',
    expectedType: 'success'
  },
  
  // Scale
  {
    name: 'Scale - Uniform scaling',
    code: 'scale(2) cube(5);',
    expectedType: 'success'
  },
  {
    name: 'Scale - Different axes',
    code: 'scale([2, 1, 0.5]) cube(10);',
    expectedType: 'success'
  },
  {
    name: 'Scale - Fractional scaling',
    code: 'scale(0.5) sphere(20);',
    expectedType: 'success'
  },
  {
    name: 'Scale - Negative scaling',
    code: 'scale([-1, 1, 1]) cube(10);',
    expectedType: 'success'
  },
  
  // Mirror
  {
    name: 'Mirror - X-axis mirror',
    code: 'mirror([1, 0, 0]) cube([10, 5, 8]);',
    expectedType: 'success'
  },
  {
    name: 'Mirror - Y-axis mirror',
    code: 'mirror([0, 1, 0]) translate([5, 0, 0]) cube(5);',
    expectedType: 'success'
  },
  {
    name: 'Mirror - Z-axis mirror',
    code: 'mirror([0, 0, 1]) translate([0, 0, 10]) cube(8);',
    expectedType: 'success'
  },
  {
    name: 'Mirror - Diagonal mirror',
    code: 'mirror([1, 1, 0]) rotate([0, 0, 45]) cube(10);',
    expectedType: 'success'
  },
  
  // Multmatrix
  {
    name: 'Multmatrix - Identity matrix',
    code: 'multmatrix([[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]) cube(10);',
    expectedType: 'success'
  },
  {
    name: 'Multmatrix - Translation matrix',
    code: 'multmatrix([[1,0,0,5],[0,1,0,10],[0,0,1,15],[0,0,0,1]]) sphere(5);',
    expectedType: 'success'
  },
  {
    name: 'Multmatrix - Rotation matrix X',
    code: 'multmatrix([[1,0,0,0],[0,0.707,-0.707,0],[0,0.707,0.707,0],[0,0,0,1]]) cube(10);',
    expectedType: 'success'
  },
  {
    name: 'Multmatrix - Complex transformation',
    code: 'multmatrix([[2,0,0,5],[0,1.5,0,0],[0,0,0.5,10],[0,0,0,1]]) sphere(8);',
    expectedType: 'success'
  },
  
  // Linear Extrude
  {
    name: 'Linear Extrude - Simple extrusion',
    code: 'linear_extrude(10) square(20);',
    expectedType: 'success'
  },
  {
    name: 'Linear Extrude - With twist',
    code: 'linear_extrude(20, twist=90) square([10, 5]);',
    expectedType: 'success'
  },
  {
    name: 'Linear Extrude - With scale',
    code: 'linear_extrude(15, scale=2) circle(10);',
    expectedType: 'success'
  },
  {
    name: 'Linear Extrude - Complex shape',
    code: 'linear_extrude(25, twist=180, scale=0.5, slices=30) polygon([[0,0], [20,0], [15,10], [5,8]]);',
    expectedType: 'success'
  },
  {
    name: 'Linear Extrude - From circle',
    code: 'linear_extrude(30, $fn=16) circle(15);',
    expectedType: 'success'
  },
  
  // Rotate Extrude
  {
    name: 'Rotate Extrude - Simple rotation',
    code: 'rotate_extrude() translate([20, 0]) square(10);',
    expectedType: 'success'
  },
  {
    name: 'Rotate Extrude - With angle',
    code: 'rotate_extrude(angle=180) translate([15, 0]) circle(5);',
    expectedType: 'success'
  },
  {
    name: 'Rotate Extrude - Complex profile',
    code: 'rotate_extrude($fn=32) polygon([[10,0], [20,0], [15,10], [12,5]]);',
    expectedType: 'success'
  },
  {
    name: 'Rotate Extrude - With $fn',
    code: 'rotate_extrude(angle=270, $fn=48) translate([25, 0]) square([8, 12]);',
    expectedType: 'success'
  },
  
  // Combined transformations
  {
    name: 'Combined - Transform chain',
    code: 'translate([10, 10, 0]) rotate(45) scale(1.5) cube(8);',
    expectedType: 'success'
  },
  {
    name: 'Combined - Nested transformations',
    code: 'rotate([0, 0, 45]) { translate([10, 0, 0]) scale(2) sphere(5); translate([-10, 0, 0]) cube(8); }',
    expectedType: 'success'
  },
  {
    name: 'Combined - Extrude with transformation',
    code: 'translate([0, 0, 5]) rotate([45, 0, 0]) linear_extrude(10, twist=90) square(15);',
    expectedType: 'success'
  },
  {
    name: 'Combined - Multiple extrusions',
    code: 'union() { rotate_extrude(angle=180) translate([10, 0]) square(8); linear_extrude(20) circle(10); }',
    expectedType: 'success'
  },
  
  // Edge cases and error handling
  {
    name: 'Transform - Zero scale',
    code: 'scale(0) cube(10);',
    expectedType: 'success' // Should handle gracefully
  },
  {
    name: 'Translate - Very large values',
    code: 'translate([1e6, 1e6, 1e6]) cube(1);',
    expectedType: 'success' // Should handle gracefully
  },
  {
    name: 'Rotate - 360 degree rotation',
    code: 'rotate(360) cube(10);',
    expectedType: 'success'
  },
  {
    name: 'Linear Extrude - Zero height',
    code: 'linear_extrude(0) square(10);',
    expectedType: 'success' // Should produce no geometry
  }
];