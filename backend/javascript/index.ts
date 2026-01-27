/**
 * moicad JavaScript API - Module Entry Point
 *
 * Export the fluent Shape class (primary API) and functional API (alternative).
 * Users can import this module in their JavaScript CAD code:
 *
 * **Fluent/OOP style (PRIMARY - recommended):**
 * ```javascript
 * import { Shape } from 'moicad';
 *
 * export default Shape.cube(10)
 *   .union(Shape.sphere(5).translate([10, 0, 0]))
 *   .color('blue');
 * ```
 *
 * **Functional style (ALTERNATIVE):**
 * ```javascript
 * import { cube, sphere, translate, union } from 'moicad';
 *
 * export default union(
 *   cube(10),
 *   translate([10, 0, 0], sphere(5))
 * );
 * ```
 */

// Primary API - Fluent/OOP style
export { Shape } from './shape';

// Alternative API - Functional style
export * from './functional';
