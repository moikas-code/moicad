/**
 * Runtime Module Example
 * 
 * Demonstrates JavaScript evaluation capabilities in @moicad/sdk
 */

// Example usage of runtime module
export const runtimeExample = `
import { evaluateJavaScript } from '@moicad/sdk/runtime';

// Basic Shape creation
const result1 = await evaluateJavaScript(\`
  import { Shape } from '@moicad/sdk';
  export default Shape.cube(10);
\`);

// Functional API
const result2 = await evaluateJavaScript(\`
  import { cube, sphere, union } from '@moicad/sdk';
  export default union(cube(10), sphere(5).translate([15, 0, 0]));
\`);

// Complex operations with variables
const result3 = await evaluateJavaScript(\`
  import { Shape } from '@moicad/sdk';
  
  const base = Shape.cube(20);
  const holes = [
    Shape.cylinder(2, 25).translate([5, 5, 0]),
    Shape.cylinder(2, 25).translate([-5, 5, 0]),
    Shape.cylinder(2, 25).translate([5, -5, 0]),
    Shape.cylinder(2, 25).translate([-5, -5, 0])
  ];
  
  export default base.subtract(holes.reduce((acc, hole) => acc.subtract(hole)));
\`);

console.log('All evaluations completed!');
console.log('Result 1 vertices:', result1.geometry?.vertices.length);
console.log('Result 2 vertices:', result2.geometry?.vertices.length);
console.log('Result 3 vertices:', result3.geometry?.vertices.length);
`;

export default runtimeExample;