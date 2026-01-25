export default [
  // Union operations
  {
    name: 'Union - Simple two objects',
    code: 'union() { cube(10); translate([15, 0, 0]) cube(10); }',
    expectedType: 'success'
  },
  {
    name: 'Union - Multiple objects',
    code: 'union() { cube(10); sphere(8); cylinder(5, 15); }',
    expectedType: 'success'
  },
  {
    name: 'Union - Overlapping cubes',
    code: 'union() { cube(10); translate([5, 5, 0]) cube(10); }',
    expectedType: 'success'
  },
  {
    name: 'Union - Different shape types',
    code: 'union() { cube(15); sphere(10); translate([0, 0, 10]) cylinder(8, 20); }',
    expectedType: 'success'
  },
  {
    name: 'Union - Nested unions',
    code: 'union() { union() { cube(8); translate([10, 0, 0]) cube(8); } translate([0, 10, 0]) sphere(6); }',
    expectedType: 'success'
  },
  
  // Difference operations
  {
    name: 'Difference - Simple subtraction',
    code: 'difference() { cube(20); translate([10, 10, 0]) cube(10); }',
    expectedType: 'success'
  },
  {
    name: 'Difference - Hole in object',
    code: 'difference() { cube(20); translate([10, 10, -1]) cylinder(5, 22); }',
    expectedType: 'success'
  },
  {
    name: 'Difference - Multiple subtractions',
    code: 'difference() { cube(25); translate([8, 8, -1]) cylinder(4, 27); translate([17, 17, -1]) cylinder(4, 27); }',
    expectedType: 'success'
  },
  {
    name: 'Difference - Complex shape',
    code: 'difference() { sphere(20); translate([0, 0, -10]) cube(30, center=true); }',
    expectedType: 'success'
  },
  {
    name: 'Difference - Nested differences',
    code: 'difference() { cube(20); difference() { translate([5, 5, 5]) cube(10); translate([8, 8, 8]) cube(4); } }',
    expectedType: 'success'
  },
  
  // Intersection operations
  {
    name: 'Intersection - Simple overlap',
    code: 'intersection() { cube(20, center=true); translate([5, 5, 0]) cube(20, center=true); }',
    expectedType: 'success'
  },
  {
    name: 'Intersection - Sphere and cube',
    code: 'intersection() { sphere(15); cube(20, center=true); }',
    expectedType: 'success'
  },
  {
    name: 'Intersection - Multiple objects',
    code: 'intersection() { cube(25, center=true); sphere(18); translate([0, 0, 5]) cube(15, center=true); }',
    expectedType: 'success'
  },
  {
    name: 'Intersection - Sliding objects',
    code: 'intersection() { cube(20); translate([15, 15, 0]) cube(20); }',
    expectedType: 'success'
  },
  
  // Hull operations
  {
    name: 'Hull - Two points',
    code: 'hull() { translate([0, 0, 0]) cube(1); translate([20, 20, 20]) cube(1); }',
    expectedType: 'success'
  },
  {
    name: 'Hull - Multiple points',
    code: 'hull() { cube(5); translate([20, 0, 0]) sphere(5); translate([0, 20, 0]) cylinder(3, 10); translate([0, 0, 20]) cube(3); }',
    expectedType: 'success'
  },
  {
    name: 'Hull - Overlapping objects',
    code: 'hull() { cube(10); translate([5, 5, 0]) cube(10); translate([10, 0, 10]) sphere(8); }',
    expectedType: 'success'
  },
  {
    name: 'Hull - Complex arrangement',
    code: 'hull() { translate([0, 0, 0]) sphere(5); translate([30, 0, 0]) sphere(5); translate([15, 25, 10]) sphere(5); }',
    expectedType: 'success'
  },
  
  // Minkowski operations
  {
    name: 'Minkowski - Simple minkowski',
    code: 'minkowski() { cube(10); sphere(2); }',
    expectedType: 'success'
  },
  {
    name: 'Minkowski - Cube and cylinder',
    code: 'minkowski() { cube(15); cylinder(2, 5); }',
    expectedType: 'success'
  },
  {
    name: 'Minkowski - Multiple objects',
    code: 'minkowski() { cube(10); sphere(3); cylinder(1, 6); }',
    expectedType: 'success'
  },
  {
    name: 'Minkowski - Complex shapes',
    code: 'minkowski() { linear_extrude(10) polygon([[0,0], [10,0], [8,8], [2,6]]); sphere(2); }',
    expectedType: 'success'
  },
  
  // Complex boolean combinations
  {
    name: 'Complex - Union of differences',
    code: 'union() { difference() { cube(20); translate([10, 10, -1]) cylinder(5, 22); } difference() { translate([0, 25, 0]) cube(20); translate([10, 35, -1]) cylinder(3, 22); } }',
    expectedType: 'success'
  },
  {
    name: 'Complex - Difference of unions',
    code: 'difference() { union() { cube(30); translate([15, 15, 0]) sphere(12); } union() { translate([10, 10, 10]) cube(15); translate([20, 20, 10]) sphere(8); } }',
    expectedType: 'success'
  },
  {
    name: 'Complex - Intersection of differences',
    code: 'intersection() { difference() { cube(25); translate([5, 5, 5]) cube(15); } difference() { translate([10, 0, 0]) cube(25); translate([15, 5, 5]) cube(15); } }',
    expectedType: 'success'
  },
  {
    name: 'Complex - Hull of intersections',
    code: 'hull() { intersection() { cube(15); sphere(12); } intersection() { translate([20, 0, 0]) cube(15); translate([20, 0, 0]) sphere(12); } }',
    expectedType: 'success'
  },
  {
    name: 'Complex - Minkowski with boolean',
    code: 'minkowski() { difference() { cube(15); translate([5, 5, 5]) cube(8); } sphere(2); }',
    expectedType: 'success'
  },
  
  // Boolean operations with transformations
  {
    name: 'Boolean + Transform - Transformed union',
    code: 'translate([10, 0, 0]) union() { cube(10); rotate(45) cube(10); }',
    expectedType: 'success'
  },
  {
    name: 'Boolean + Transform - Rotated difference',
    code: 'rotate([0, 0, 45]) difference() { cube(20); translate([10, 10, 0]) cube(8); }',
    expectedType: 'success'
  },
  {
    name: 'Boolean + Transform - Scaled intersection',
    code: 'scale(1.5) intersection() { sphere(15); cube(20, center=true); }',
    expectedType: 'success'
  },
  {
    name: 'Boolean + Transform - Multiple transforms',
    code: 'translate([5, 5, 0]) rotate([45, 0, 0]) scale([1, 2, 0.5]) union() { cube(10); sphere(8); }',
    expectedType: 'success'
  },
  
  // Edge cases and error handling
  {
    name: 'Boolean - Empty union',
    code: 'union() { }',
    expectedType: 'error' // Should fail - no children
  },
  {
    name: 'Boolean - Single object union',
    code: 'union() { cube(10); }',
    expectedType: 'success' // Should work - single child
  },
  {
    name: 'Boolean - Difference with no base',
    code: 'difference() { }',
    expectedType: 'error' // Should fail - no base object
  },
  {
    name: 'Boolean - Intersection of non-overlapping',
    code: 'intersection() { translate([0, 0, 0]) cube(10); translate([50, 50, 50]) cube(10); }',
    expectedType: 'success' // Should succeed with empty geometry
  },
  {
    name: 'Boolean - Very complex nested',
    code: 'union() { difference() { intersection() { cube(30); sphere(20); } hull() { translate([10, 10, 10]) cube(5); translate([-10, -10, -10]) cube(5); } } minkowski() { translate([40, 0, 0]) cube(15); sphere(3); } }',
    expectedType: 'success'
  }
];