/**
 * Interactive Model Types
 *
 * Defines types for interactive CAD models with movable parts,
 * constraints, and simulation support.
 */

import type { Shape } from '../shape';

/**
 * 3D Vector type
 */
export type Vector3 = [number, number, number];

/**
 * Transform state for a part
 */
export interface Transform {
  position: Vector3;
  rotation: Vector3;  // Euler angles in degrees
  scale: Vector3;
}

/**
 * Constraint types - define how parts can move
 */
export type ConstraintType =
  | 'fixed'    // Cannot move at all
  | 'hinge'    // Rotates around a single axis (door, lid)
  | 'slider'   // Moves along a single axis (drawer)
  | 'ball'     // Rotates freely around a point (ball joint)
  | 'piston'   // Moves along axis with optional rotation (suspension)
  | 'planar'   // Moves within a 2D plane
  | 'free';    // No constraints, fully free movement

/**
 * Constraint definition - how a part can move
 */
export interface Constraint {
  /** Type of constraint */
  type: ConstraintType;

  /** Axis for rotation/translation (normalized vector) */
  axis?: Vector3;

  /** Pivot point for rotation constraints */
  pivot?: Vector3;

  /** Range limits [min, max] in degrees for rotation or mm for translation */
  range?: [number, number];

  /** Whether part springs back to initial position when released */
  springBack?: boolean;

  /** Spring strength (0-1) - how fast to return */
  springStrength?: number;

  /** Damping factor (0-1) - resistance to movement */
  damping?: number;

  /** Snap positions - part snaps to these values */
  snapPoints?: number[];

  /** Snap threshold - distance to trigger snap */
  snapThreshold?: number;
}

/**
 * Link between parts - one part's movement affects another
 */
export interface PartLink {
  /** ID of the part this links to */
  partId: string;

  /** Ratio of movement (e.g., -0.5 means half speed, opposite direction) */
  ratio: number;

  /** Type of link */
  type?: 'gear' | 'belt' | 'rod' | 'custom';

  /** Offset in the linked movement */
  offset?: number;
}

/**
 * Interactive part - a movable component of the model
 */
export interface InteractivePart {
  /** Unique identifier for this part */
  id: string;

  /** Shape geometry for this part */
  shape: Shape;

  /** How this part can move */
  constraint?: Constraint;

  /** Initial transform state */
  initialTransform?: Partial<Transform>;

  /** Link to other parts (for gear trains, linkages, etc.) */
  linkedTo?: PartLink;

  /** Display name for UI */
  label?: string;

  /** Color override for this part */
  color?: string | [number, number, number];

  /** Whether this part is currently selected */
  selected?: boolean;

  /** Whether this part is visible */
  visible?: boolean;

  /** Custom data attached to this part */
  userData?: Record<string, any>;
}

/**
 * Current state of an interactive part
 */
export interface PartState {
  /** Part ID */
  id: string;

  /** Current transform */
  transform: Transform;

  /** Current constraint value (angle or distance) */
  value: number;

  /** Whether part is being manipulated */
  isDragging: boolean;

  /** Whether part is animating (e.g., spring back) */
  isAnimating: boolean;
}

/**
 * Interactive model definition
 */
export interface InteractiveModel {
  /** Array of interactive parts */
  parts: InteractivePart[];

  /** Optional assembly function to combine parts */
  assemble?: (parts: Record<string, Shape>) => Shape;

  /** Model metadata */
  metadata?: {
    name?: string;
    description?: string;
    author?: string;
    version?: string;
    tags?: string[];
  };

  /** Global settings for the model */
  settings?: {
    /** Show constraint axes/gizmos */
    showConstraints?: boolean;
    /** Enable collision detection */
    enableCollisions?: boolean;
    /** Physics simulation settings */
    physics?: {
      gravity?: Vector3;
      friction?: number;
    };
  };
}

/**
 * Events emitted by the interaction system
 */
export interface InteractionEvents {
  /** Part was selected */
  onSelect?: (partId: string | null) => void;

  /** Part transform changed */
  onTransformChange?: (partId: string, transform: Transform, value: number) => void;

  /** Part started being dragged */
  onDragStart?: (partId: string) => void;

  /** Part stopped being dragged */
  onDragEnd?: (partId: string) => void;

  /** Constraint limit was reached */
  onLimitReached?: (partId: string, limit: 'min' | 'max') => void;

  /** Part snapped to a position */
  onSnap?: (partId: string, snapValue: number) => void;

  /** Model state changed */
  onStateChange?: (state: Record<string, PartState>) => void;
}

/**
 * Options for the interaction manager
 */
export interface InteractionManagerOptions {
  /** Enable/disable interactions */
  enabled?: boolean;

  /** Show transform gizmos */
  showGizmos?: boolean;

  /** Gizmo size */
  gizmoSize?: number;

  /** Highlight color for selected parts */
  selectionColor?: string;

  /** Highlight color for hovered parts */
  hoverColor?: string;

  /** Enable multi-select with Ctrl/Cmd */
  multiSelect?: boolean;

  /** Snap to grid */
  snapToGrid?: boolean;

  /** Grid size for snapping */
  gridSize?: number;

  /** Event handlers */
  events?: InteractionEvents;
}

/**
 * Serialized model state for save/load
 */
export interface SerializedModelState {
  /** Model version for compatibility */
  version: number;

  /** Timestamp when state was saved */
  timestamp: number;

  /** Part states */
  parts: Record<string, {
    value: number;
    transform: Transform;
  }>;
}
