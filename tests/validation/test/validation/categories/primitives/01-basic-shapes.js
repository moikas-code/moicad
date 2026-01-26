export default [
  // Basic 3D primitives
  {
    name: 'Cube - Default size',
    code: 'cube();',
    expectedType: 'success'
  },
  {
    name: 'Cube - Single value',
    code: 'cube(10);',
    expectedType: 'success'
  },
  {
    name: 'Cube - Array size',
    code: 'cube([10, 20, 30]);',
    expectedType: 'success'
  },
  {
    name: 'Cube - With center',
    code: 'cube(10, center=true);',
    expectedType: 'success'
  },
  
  // Sphere
  {
    name: 'Sphere - Default radius',
    code: 'sphere();',
    expectedType: 'success'
  },
  {
    name: 'Sphere - Radius parameter',
    code: 'sphere(5);',
    expectedType: 'success'
  },
  {
    name: 'Sphere - Named radius',
    code: 'sphere(r=8);',
    expectedType: 'success'
  },
  {
    name: 'Sphere - Diameter',
    code: 'sphere(d=20);',
    expectedType: 'success'
  },
  {
    name: 'Sphere - With $fn',
    code: 'sphere(10, $fn=32);',
    expectedType: 'success'
  },
  
  // Cylinder
  {
    name: 'Cylinder - Default',
    code: 'cylinder();',
    expectedType: 'success'
  },
  {
    name: 'Cylinder - Radius and height',
    code: 'cylinder(r=5, h=20);',
    expectedType: 'success'
  },
  {
    name: 'Cylinder - Single radius',
    code: 'cylinder(5, 20);',
    expectedType: 'success'
  },
  {
    name: 'Cylinder - Different top/bottom radius',
    code: 'cylinder(r1=8, r2=4, h=15);',
    expectedType: 'success'
  },
  {
    name: 'Cylinder - With $fn',
    code: 'cylinder(5, 20, $fn=24);',
    expectedType: 'success'
  },
  
  // Cone
  {
    name: 'Cone - Default',
    code: 'cone();',
    expectedType: 'success'
  },
  {
    name: 'Cone - Radius and height',
    code: 'cone(r=6, h=25);',
    expectedType: 'success'
  },
  {
    name: 'Cone - With $fn',
    code: 'cone(8, 30, $fn=16);',
    expectedType: 'success'
  },
  
  // 2D primitives
  {
    name: 'Circle - Default radius',
    code: 'circle();',
    expectedType: 'success'
  },
  {
    name: 'Circle - Radius parameter',
    code: 'circle(7);',
    expectedType: 'success'
  },
  {
    name: 'Circle - Named radius',
    code: 'circle(r=12);',
    expectedType: 'success'
  },
  {
    name: 'Circle - Diameter',
    code: 'circle(d=24);',
    expectedType: 'success'
  },
  {
    name: 'Circle - With $fn',
    code: 'circle(10, $fn=32);',
    expectedType: 'success'
  },
  
  {
    name: 'Square - Default size',
    code: 'square();',
    expectedType: 'success'
  },
  {
    name: 'Square - Single value',
    code: 'square(15);',
    expectedType: 'success'
  },
  {
    name: 'Square - Array size',
    code: 'square([20, 10]);',
    expectedType: 'success'
  },
  {
    name: 'Square - With center',
    code: 'square(15, center=true);',
    expectedType: 'success'
  },
  
  // Custom shapes
  {
    name: 'Polygon - Triangle',
    code: 'polygon([[0,0], [10,0], [5,10]]);',
    expectedType: 'success'
  },
  {
    name: 'Polygon - Complex shape',
    code: 'polygon([[0,0], [20,0], [25,10], [15,20], [5,15]]);',
    expectedType: 'success'
  },
  {
    name: 'Polygon - With holes',
    code: 'polygon([[0,0], [20,0], [20,20], [0,20]], [[5,5], [15,5], [15,15], [5,15]]);',
    expectedType: 'success'
  },
  
  {
    name: 'Polyhedron - Tetrahedron',
    code: 'polyhedron([[0,0,0], [10,0,0], [5,10,0], [5,5,10]], [[0,1,2], [0,1,3], [1,2,3], [0,2,3]]);',
    expectedType: 'success'
  },
  {
    name: 'Polyhedron - Cube',
    code: 'polyhedron([[0,0,0], [10,0,0], [10,10,0], [0,10,0], [0,0,10], [10,0,10], [10,10,10], [0,10,10]], [[0,1,2,3], [4,5,6,7], [0,1,5,4], [2,3,7,6], [0,3,7,4], [1,2,6,5]]);',
    expectedType: 'success'
  },
  
  // Error cases
  {
    name: 'Cube - Negative size (should fail gracefully)',
    code: 'cube(-10);',
    expectedType: 'success' // Should handle gracefully
  },
  {
    name: 'Sphere - Negative radius (should fail gracefully)',
    code: 'sphere(-5);',
    expectedType: 'success' // Should handle gracefully
  },
  {
    name: 'Polygon - Insufficient points (should fail)',
    code: 'polygon([[0,0], [10,0]]);',
    expectedType: 'error' // Should fail
  }
];