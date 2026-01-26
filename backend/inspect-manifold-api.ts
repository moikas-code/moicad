import Module from 'manifold-3d';

async function inspectAPI() {
  const wasm = await Module();
  wasm.setup();

  const cube = wasm.Manifold.cube([10,10,10]);

  console.log('Manifold object properties and methods:');
  console.log('=======================================\n');

  // Get all properties
  const props = Object.getOwnPropertyNames(Object.getPrototypeOf(cube));
  console.log('Methods/Properties:', props.join(', '), '\n');

  // Test each method to see what it returns
  console.log('Testing methods:');
  console.log('numVert:', cube.numVert);
  console.log('numTri:', cube.numTri);
  console.log('getMesh():', typeof cube.getMesh === 'function' ? 'function exists' : 'NOT A FUNCTION');
  console.log('getProperties():', typeof cube.getProperties === 'function' ? 'function exists' : 'NOT A FUNCTION');

  // Try to call getMesh
  try {
    const mesh = cube.getMesh();
    console.log('\nMesh structure:');
    console.log('- numVert:', mesh.numVert);
    console.log('- numTri:', mesh.numTri);
    console.log('- vertProperties length:', mesh.vertProperties.length);
    console.log('- triVerts length:', mesh.triVerts.length);
  } catch (e) {
    console.log('getMesh() error:', e);
  }

  // Try to call getProperties
  try {
    const props = cube.getProperties();
    console.log('\nProperties:', props);
  } catch (e) {
    console.log('getProperties() error:', e);
  }

  // Test CSG operations
  console.log('\nTesting CSG:');
  const cube2 = wasm.Manifold.cube([5,5,5]);
  try {
    const union = cube.add(cube2);
    console.log('Union works! numTri:', union.numTri);
  } catch (e) {
    console.log('Union error:', e);
  }
}

inspectAPI();
