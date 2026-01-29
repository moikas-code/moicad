/**
 * Interactive Model Builder
 *
 * Helper functions for creating interactive CAD models with movable parts.
 *
 * @example
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
 */

import type { Shape } from '../shape';
import type {
  InteractiveModel,
  InteractivePart,
  Constraint,
  ConstraintType,
  PartLink,
  Transform,
  Vector3,
} from './types';

/**
 * Create an interactive model from parts definition
 *
 * @param definition - Interactive model definition
 * @returns InteractiveModel with validated parts
 */
export function interactive(definition: InteractiveModel): InteractiveModel {
  // Validate parts
  const validatedParts = definition.parts.map(validatePart);

  // Check for duplicate IDs
  const ids = new Set<string>();
  for (const part of validatedParts) {
    if (ids.has(part.id)) {
      throw new Error(`Duplicate part ID: "${part.id}"`);
    }
    ids.add(part.id);
  }

  // Validate links reference existing parts
  for (const part of validatedParts) {
    if (part.linkedTo) {
      if (!ids.has(part.linkedTo.partId)) {
        throw new Error(
          `Part "${part.id}" links to non-existent part "${part.linkedTo.partId}"`
        );
      }
    }
  }

  return {
    ...definition,
    parts: validatedParts,
  };
}

/**
 * Validate and normalize a part definition
 */
function validatePart(part: InteractivePart): InteractivePart {
  if (!part.id) {
    throw new Error('Part must have an id');
  }

  if (!part.shape) {
    throw new Error(`Part "${part.id}" must have a shape`);
  }

  // Normalize constraint
  const constraint = part.constraint
    ? validateConstraint(part.constraint)
    : { type: 'fixed' as ConstraintType };

  // Normalize initial transform
  const initialTransform: Partial<Transform> = {
    position: part.initialTransform?.position || [0, 0, 0],
    rotation: part.initialTransform?.rotation || [0, 0, 0],
    scale: part.initialTransform?.scale || [1, 1, 1],
  };

  return {
    ...part,
    constraint,
    initialTransform,
    visible: part.visible !== false,
  };
}

/**
 * Validate constraint definition
 */
function validateConstraint(constraint: Constraint): Constraint {
  const result: Constraint = { ...constraint };

  // Validate constraint type
  const validTypes: ConstraintType[] = [
    'fixed', 'hinge', 'slider', 'ball', 'piston', 'planar', 'free'
  ];

  if (!validTypes.includes(constraint.type)) {
    throw new Error(`Invalid constraint type: "${constraint.type}"`);
  }

  // Validate axis for constraints that need it
  if (['hinge', 'slider', 'piston'].includes(constraint.type)) {
    if (!constraint.axis) {
      // Default to Z axis for hinge, Y axis for slider
      result.axis = constraint.type === 'slider' ? [0, 1, 0] : [0, 0, 1];
    } else {
      // Normalize axis
      result.axis = normalizeVector(constraint.axis);
    }
  }

  // Validate pivot for rotation constraints
  if (['hinge', 'ball'].includes(constraint.type)) {
    result.pivot = constraint.pivot || [0, 0, 0];
  }

  // Validate range
  if (constraint.range) {
    if (constraint.range.length !== 2) {
      throw new Error('Range must be [min, max]');
    }
    if (constraint.range[0] > constraint.range[1]) {
      throw new Error('Range min must be <= max');
    }
  }

  // Validate spring settings
  if (constraint.springStrength !== undefined) {
    result.springStrength = Math.max(0, Math.min(1, constraint.springStrength));
  }

  if (constraint.damping !== undefined) {
    result.damping = Math.max(0, Math.min(1, constraint.damping));
  }

  return result;
}

/**
 * Normalize a 3D vector to unit length
 */
function normalizeVector(v: Vector3): Vector3 {
  const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (length === 0) {
    return [0, 0, 1]; // Default to Z axis
  }
  return [v[0] / length, v[1] / length, v[2] / length];
}

// ============================================================================
// PART BUILDER HELPERS
// ============================================================================

/**
 * Create a fixed part (cannot move)
 */
export function fixedPart(id: string, shape: Shape, options?: Partial<InteractivePart>): InteractivePart {
  return {
    id,
    shape,
    constraint: { type: 'fixed' },
    ...options,
  };
}

/**
 * Create a hinge part (rotates around axis)
 */
export function hingePart(
  id: string,
  shape: Shape,
  options: {
    axis: Vector3;
    pivot: Vector3;
    range?: [number, number];
    springBack?: boolean;
    springStrength?: number;
  } & Partial<InteractivePart>
): InteractivePart {
  const { axis, pivot, range, springBack, springStrength, ...rest } = options;

  return {
    id,
    shape,
    constraint: {
      type: 'hinge',
      axis,
      pivot,
      range,
      springBack,
      springStrength,
    },
    ...rest,
  };
}

/**
 * Create a slider part (moves along axis)
 */
export function sliderPart(
  id: string,
  shape: Shape,
  options: {
    axis: Vector3;
    range?: [number, number];
    springBack?: boolean;
    springStrength?: number;
  } & Partial<InteractivePart>
): InteractivePart {
  const { axis, range, springBack, springStrength, ...rest } = options;

  return {
    id,
    shape,
    constraint: {
      type: 'slider',
      axis,
      range,
      springBack,
      springStrength,
    },
    ...rest,
  };
}

/**
 * Create a ball joint part (rotates freely around pivot)
 */
export function ballJointPart(
  id: string,
  shape: Shape,
  options: {
    pivot: Vector3;
    range?: [number, number];
  } & Partial<InteractivePart>
): InteractivePart {
  const { pivot, range, ...rest } = options;

  return {
    id,
    shape,
    constraint: {
      type: 'ball',
      pivot,
      range,
    },
    ...rest,
  };
}

/**
 * Create a linked part (moves in sync with another part)
 */
export function linkedPart(
  id: string,
  shape: Shape,
  linkedTo: string,
  ratio: number,
  constraint?: Constraint,
  options?: Partial<InteractivePart>
): InteractivePart {
  return {
    id,
    shape,
    constraint: constraint || { type: 'hinge', axis: [0, 0, 1] },
    linkedTo: { partId: linkedTo, ratio },
    ...options,
  };
}

// ============================================================================
// PRESET MODELS
// ============================================================================

/**
 * Create a simple box with opening lid
 */
export function createBoxWithLid(
  width: number = 30,
  depth: number = 30,
  height: number = 20,
  lidThickness: number = 2,
  maxOpenAngle: number = 110
): (Shape: typeof import('../shape').Shape) => InteractiveModel {
  return (Shape) => interactive({
    parts: [
      fixedPart('base', Shape.cube([width, depth, height - lidThickness])),
      hingePart('lid', Shape.cube([width, depth, lidThickness]).translate([0, 0, height - lidThickness]), {
        axis: [1, 0, 0],
        pivot: [0, depth, height - lidThickness],
        range: [0, maxOpenAngle],
      }),
    ],
    metadata: {
      name: 'Box with Lid',
      description: `${width}x${depth}x${height}mm box with hinged lid`,
    },
  });
}

/**
 * Create a drawer unit
 */
export function createDrawer(
  width: number = 40,
  depth: number = 30,
  height: number = 50,
  drawerHeight: number = 10,
  maxPull: number = 20
): (Shape: typeof import('../shape').Shape) => InteractiveModel {
  return (Shape) => {
    // Cabinet with drawer cavity
    const cabinet = Shape.cube([width, depth, height])
      .subtract(
        Shape.cube([width - 4, depth, drawerHeight])
          .translate([2, 0, height - drawerHeight - 2])
      );

    // Drawer
    const drawer = Shape.cube([width - 5, depth - 5, drawerHeight - 2])
      .translate([2.5, 2.5, height - drawerHeight - 1]);

    return interactive({
      parts: [
        fixedPart('cabinet', cabinet),
        sliderPart('drawer', drawer, {
          axis: [0, 1, 0],
          range: [0, maxPull],
          springBack: true,
          springStrength: 0.3,
        }),
      ],
      metadata: {
        name: 'Drawer Unit',
        description: `${width}x${depth}x${height}mm cabinet with sliding drawer`,
      },
    });
  };
}
