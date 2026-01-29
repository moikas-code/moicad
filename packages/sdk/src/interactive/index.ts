/**
 * Interactive Module for moicad
 *
 * Provides CAD/Blender-like interactive manipulation for 3D models.
 * Users can define parts with constraints (hinges, sliders, ball joints)
 * and interact with them by clicking and dragging.
 *
 * @example Basic box with lid
 * ```typescript
 * import { Shape, interactive } from '@moicad/sdk';
 *
 * export default interactive({
 *   parts: [
 *     {
 *       id: 'base',
 *       shape: Shape.cube([30, 30, 10]),
 *       constraint: { type: 'fixed' }
 *     },
 *     {
 *       id: 'lid',
 *       shape: Shape.cube([30, 30, 2]).translate([0, 0, 10]),
 *       constraint: {
 *         type: 'hinge',
 *         axis: [1, 0, 0],
 *         pivot: [0, 30, 10],
 *         range: [0, 110]
 *       }
 *     }
 *   ]
 * });
 * ```
 *
 * @example Using InteractionManager in a Three.js scene
 * ```typescript
 * import { InteractionManager } from '@moicad/sdk/interactive';
 *
 * const manager = new InteractionManager(scene, camera, renderer, {
 *   events: {
 *     onSelect: (partId) => console.log('Selected:', partId),
 *     onTransformChange: (partId, transform, value) => {
 *       console.log(`Part ${partId} value: ${value}`);
 *     }
 *   }
 * });
 *
 * manager.loadModel(myInteractiveModel);
 * ```
 */

// Main API
export { interactive, fixedPart, hingePart, sliderPart, ballJointPart, linkedPart, createBoxWithLid, createDrawer } from './interactive';

// Core classes
export { InteractionManager } from './interaction-manager';
export { ConstraintSolver, type TransformDelta } from './constraint-solver';
export { TransformGizmo, createGizmo, type GizmoOptions } from './gizmo';

// Types
export type {
  Vector3,
  Transform,
  ConstraintType,
  Constraint,
  PartLink,
  InteractivePart,
  PartState,
  InteractiveModel,
  InteractionEvents,
  InteractionManagerOptions,
  SerializedModelState,
} from './types';
