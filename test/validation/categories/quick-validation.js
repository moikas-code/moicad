export default [
  // Quick validation of critical features
  {
    name: 'Basic cube',
    code: 'cube(10);',
    expectedType: 'success'
  },
  {
    name: 'Basic sphere',
    code: 'sphere(8);',
    expectedType: 'success'
  },
  {
    name: 'Translate transform',
    code: 'translate([10, 0, 0]) cube(5);',
    expectedType: 'success'
  },
  {
    name: 'Rotate transform',
    code: 'rotate(45) cube(6);',
    expectedType: 'success'
  },
  {
    name: 'Scale transform',
    code: 'scale(2) cube(4);',
    expectedType: 'success'
  },
  {
    name: 'Simple union',
    code: 'union() { cube(10); sphere(8); }',
    expectedType: 'success'
  },
  {
    name: 'Simple difference',
    code: 'difference() { cube(20); translate([10, 10, 0]) cylinder(5, 25); }',
    expectedType: 'success'
  },
  {
    name: 'Simple intersection',
    code: 'intersection() { cube(15); sphere(12); }',
    expectedType: 'success'
  },
  {
    name: 'Variable assignment',
    code: 'size = 15; cube(size);',
    expectedType: 'success'
  },
  {
    name: 'Function definition',
    code: 'function double(x) = x * 2; cube(double(6));',
    expectedType: 'success'
  },
  {
    name: 'Module definition',
    code: 'module box(w, h, d) { cube([w, h, d]); } box(10, 20, 15);',
    expectedType: 'success'
  },
  {
    name: 'If statement',
    code: 'enable = true; if (enable) { cube(10); } else { sphere(10); }',
    expectedType: 'success'
  },
  {
    name: 'For loop',
    code: 'for (i = [0:2]) { translate([i*12, 0, 0]) cube(8); }',
    expectedType: 'success'
  },
  {
    name: 'Let statement',
    code: 'let(w = 12, h = 8, d = 15) cube([w, h, d]);',
    expectedType: 'success'
  },
  {
    name: '$fn special variable',
    code: 'sphere(10, $fn=16);',
    expectedType: 'success'
  },
  {
    name: '$t animation variable',
    code: 'translate([$t * 10, 0, 0]) cube(6);',
    expectedType: 'success'
  },
  {
    name: 'Color operation',
    code: 'color([1, 0, 0]) cube(10);',
    expectedType: 'success'
  },
  {
    name: 'Polygon',
    code: 'polygon([[0,0], [10,0], [5,10]]);',
    expectedType: 'success'
  },
  {
    name: 'Linear extrude',
    code: 'linear_extrude(10) square(15);',
    expectedType: 'success'
  },
  {
    name: 'Rotate extrude',
    code: 'rotate_extrude() translate([20, 0]) square(8);',
    expectedType: 'success'
  }
];