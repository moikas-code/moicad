/**
 * Transform Gizmos for Interactive Parts
 *
 * Visual indicators that show constraint axes and interaction affordances.
 * - Rotation ring for hinge constraints
 * - Arrow for slider constraints
 * - Sphere for ball joint constraints
 * - Multi-axis for free/planar constraints
 */

import * as THREE from 'three';
import type { Constraint, ConstraintType, Vector3 } from './types';

export interface GizmoOptions {
  /** Size of the gizmo (default: 1) */
  size?: number;
  /** Opacity of the gizmo (default: 0.7) */
  opacity?: number;
  /** Whether to show range limits (default: true) */
  showLimits?: boolean;
  /** Color scheme */
  colors?: {
    x?: number;
    y?: number;
    z?: number;
    selected?: number;
    limit?: number;
  };
}

const DEFAULT_COLORS = {
  x: 0xff4444,      // Red for X axis
  y: 0x44ff44,      // Green for Y axis
  z: 0x4444ff,      // Blue for Z axis
  selected: 0xffff00, // Yellow for selection
  limit: 0xff8800,    // Orange for limits
};

/** Internal options with all colors required */
interface InternalGizmoOptions {
  size: number;
  opacity: number;
  showLimits: boolean;
  colors: {
    x: number;
    y: number;
    z: number;
    selected: number;
    limit: number;
  };
}

/**
 * TransformGizmo - Visual indicator for constraint-based interaction
 */
export class TransformGizmo {
  private group: THREE.Group;
  private constraint: Constraint | null = null;
  private options: InternalGizmoOptions;

  // Gizmo elements
  private rotationRing: THREE.Mesh | null = null;
  private translationArrow: THREE.Group | null = null;
  private ballSphere: THREE.Mesh | null = null;
  private limitIndicators: THREE.Group | null = null;

  constructor(options: GizmoOptions = {}) {
    this.group = new THREE.Group();
    this.group.name = 'TransformGizmo';
    this.group.visible = false;

    this.options = {
      size: options.size ?? 1,
      opacity: options.opacity ?? 0.7,
      showLimits: options.showLimits ?? true,
      colors: { ...DEFAULT_COLORS, ...options.colors },
    };
  }

  /**
   * Get the Three.js group containing the gizmo
   */
  getObject(): THREE.Group {
    return this.group;
  }

  /**
   * Show gizmo at position with given constraint
   */
  show(position: Vector3, constraint: Constraint): void {
    this.constraint = constraint;
    this.group.position.set(position[0], position[1], position[2]);

    // Clear existing gizmo elements
    this.clearGizmo();

    // Create appropriate gizmo based on constraint type
    switch (constraint.type) {
      case 'hinge':
        this.createRotationGizmo(constraint);
        break;
      case 'slider':
      case 'piston':
        this.createTranslationGizmo(constraint);
        break;
      case 'ball':
        this.createBallGizmo(constraint);
        break;
      case 'planar':
        this.createPlanarGizmo(constraint);
        break;
      case 'free':
        this.createFreeGizmo();
        break;
      case 'fixed':
        // No gizmo for fixed constraints
        break;
    }

    this.group.visible = true;
  }

  /**
   * Hide the gizmo
   */
  hide(): void {
    this.group.visible = false;
    this.constraint = null;
  }

  /**
   * Update gizmo position
   */
  setPosition(position: Vector3): void {
    this.group.position.set(position[0], position[1], position[2]);
  }

  /**
   * Highlight specific axis (for hover feedback)
   */
  highlightAxis(axis: 'x' | 'y' | 'z' | null): void {
    // Reset all materials to default
    this.resetHighlight();

    if (!axis) return;

    // Find and highlight the appropriate element
    const color = new THREE.Color(this.options.colors.selected);

    if (this.rotationRing) {
      const material = this.rotationRing.material as THREE.MeshBasicMaterial;
      material.color = color;
    }

    if (this.translationArrow) {
      this.translationArrow.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshBasicMaterial;
          material.color = color;
        }
      });
    }
  }

  /**
   * Update gizmo to show current value within range
   */
  updateValue(value: number): void {
    if (!this.constraint || !this.limitIndicators) return;

    // Update visual indicator of current position within range
    const range = this.constraint.range;
    if (!range) return;

    const [min, max] = range;
    const normalized = (value - min) / (max - min);

    // Could add a position marker or color gradient here
  }

  /**
   * Dispose of all gizmo resources
   */
  dispose(): void {
    this.clearGizmo();
  }

  // Private methods

  private clearGizmo(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);

      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    this.rotationRing = null;
    this.translationArrow = null;
    this.ballSphere = null;
    this.limitIndicators = null;
  }

  private resetHighlight(): void {
    if (!this.constraint) return;

    const axisColor = this.getAxisColor(this.constraint.axis || [0, 1, 0]);

    if (this.rotationRing) {
      const material = this.rotationRing.material as THREE.MeshBasicMaterial;
      material.color = new THREE.Color(axisColor);
    }

    if (this.translationArrow) {
      this.translationArrow.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshBasicMaterial;
          material.color = new THREE.Color(axisColor);
        }
      });
    }
  }

  private getAxisColor(axis: Vector3): number {
    // Determine primary axis and return corresponding color
    const [x, y, z] = axis;
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    const absZ = Math.abs(z);

    if (absX >= absY && absX >= absZ) return this.options.colors.x;
    if (absY >= absX && absY >= absZ) return this.options.colors.y;
    return this.options.colors.z;
  }

  /**
   * Create rotation ring for hinge constraints
   */
  private createRotationGizmo(constraint: Constraint): void {
    const axis = constraint.axis || [0, 1, 0];
    const size = this.options.size;
    const color = this.getAxisColor(axis);

    // Create torus (ring) geometry
    const geometry = new THREE.TorusGeometry(size, size * 0.05, 8, 64);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: this.options.opacity,
      side: THREE.DoubleSide,
    });

    this.rotationRing = new THREE.Mesh(geometry, material);

    // Orient ring perpendicular to rotation axis
    const axisVec = new THREE.Vector3(axis[0], axis[1], axis[2]).normalize();
    const defaultAxis = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultAxis, axisVec);
    this.rotationRing.quaternion.copy(quaternion);

    this.group.add(this.rotationRing);

    // Add range limit indicators
    if (this.options.showLimits && constraint.range) {
      this.createRotationLimits(constraint.range, axis, size);
    }
  }

  /**
   * Create arrow for slider/piston constraints
   */
  private createTranslationGizmo(constraint: Constraint): void {
    const axis = constraint.axis || [0, 1, 0];
    const size = this.options.size;
    const color = this.getAxisColor(axis);

    this.translationArrow = new THREE.Group();

    // Create cylinder for arrow shaft
    const shaftGeometry = new THREE.CylinderGeometry(size * 0.03, size * 0.03, size * 1.5, 8);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: this.options.opacity,
    });

    const shaft = new THREE.Mesh(shaftGeometry, material);
    this.translationArrow.add(shaft);

    // Create cone for arrow head (positive direction)
    const headGeometry = new THREE.ConeGeometry(size * 0.1, size * 0.2, 8);
    const headPos = new THREE.Mesh(headGeometry, material.clone());
    headPos.position.y = size * 0.85;
    this.translationArrow.add(headPos);

    // Create cone for arrow head (negative direction)
    const headNeg = new THREE.Mesh(headGeometry, material.clone());
    headNeg.position.y = -size * 0.85;
    headNeg.rotation.x = Math.PI;
    this.translationArrow.add(headNeg);

    // Orient arrow along constraint axis
    const axisVec = new THREE.Vector3(axis[0], axis[1], axis[2]).normalize();
    const defaultAxis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultAxis, axisVec);
    this.translationArrow.quaternion.copy(quaternion);

    this.group.add(this.translationArrow);

    // Add range limit indicators
    if (this.options.showLimits && constraint.range) {
      this.createTranslationLimits(constraint.range, axis, size);
    }
  }

  /**
   * Create sphere for ball joint constraints
   */
  private createBallGizmo(constraint: Constraint): void {
    const size = this.options.size;

    // Create wireframe sphere
    const geometry = new THREE.SphereGeometry(size * 0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: this.options.colors.selected,
      transparent: true,
      opacity: this.options.opacity * 0.5,
      wireframe: true,
    });

    this.ballSphere = new THREE.Mesh(geometry, material);
    this.group.add(this.ballSphere);

    // Add three rotation rings for visual feedback
    const ringColors = [this.options.colors.x, this.options.colors.y, this.options.colors.z];
    const ringAxes = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
    ];

    ringAxes.forEach((axis, i) => {
      const ringGeometry = new THREE.TorusGeometry(size * 0.6, size * 0.02, 8, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: this.options.opacity * 0.7,
      });

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);

      // Orient ring
      const defaultAxis = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultAxis, axis);
      ring.quaternion.copy(quaternion);

      this.group.add(ring);
    });
  }

  /**
   * Create planar gizmo for planar constraints
   */
  private createPlanarGizmo(constraint: Constraint): void {
    const axis = constraint.axis || [0, 0, 1]; // Normal to plane
    const size = this.options.size;

    // Create plane indicator
    const geometry = new THREE.PlaneGeometry(size * 1.5, size * 1.5);
    const material = new THREE.MeshBasicMaterial({
      color: this.getAxisColor(axis),
      transparent: true,
      opacity: this.options.opacity * 0.3,
      side: THREE.DoubleSide,
    });

    const plane = new THREE.Mesh(geometry, material);

    // Orient plane perpendicular to normal
    const axisVec = new THREE.Vector3(axis[0], axis[1], axis[2]).normalize();
    const defaultAxis = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultAxis, axisVec);
    plane.quaternion.copy(quaternion);

    this.group.add(plane);

    // Add grid lines on plane
    const gridSize = size * 1.5;
    const gridDivisions = 4;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0xffffff, 0xffffff);
    gridHelper.material.opacity = this.options.opacity * 0.5;
    gridHelper.material.transparent = true;

    // Orient grid
    gridHelper.quaternion.copy(quaternion);
    gridHelper.rotateX(Math.PI / 2);

    this.group.add(gridHelper);
  }

  /**
   * Create multi-axis gizmo for free constraints
   */
  private createFreeGizmo(): void {
    const size = this.options.size;

    // Create three arrows for each axis
    const axes: Array<{ dir: Vector3; color: number }> = [
      { dir: [1, 0, 0], color: this.options.colors.x },
      { dir: [0, 1, 0], color: this.options.colors.y },
      { dir: [0, 0, 1], color: this.options.colors.z },
    ];

    axes.forEach(({ dir, color }) => {
      // Create arrow
      const arrowGroup = new THREE.Group();

      const shaftGeometry = new THREE.CylinderGeometry(size * 0.02, size * 0.02, size, 8);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: this.options.opacity,
      });

      const shaft = new THREE.Mesh(shaftGeometry, material);
      shaft.position.y = size * 0.5;
      arrowGroup.add(shaft);

      const headGeometry = new THREE.ConeGeometry(size * 0.08, size * 0.15, 8);
      const head = new THREE.Mesh(headGeometry, material.clone());
      head.position.y = size * 1.05;
      arrowGroup.add(head);

      // Orient arrow along axis
      const axisVec = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
      const defaultAxis = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultAxis, axisVec);
      arrowGroup.quaternion.copy(quaternion);

      this.group.add(arrowGroup);
    });
  }

  /**
   * Create visual indicators for rotation limits
   */
  private createRotationLimits(range: [number, number], axis: Vector3, size: number): void {
    this.limitIndicators = new THREE.Group();

    const [minAngle, maxAngle] = range;
    const minRad = (minAngle * Math.PI) / 180;
    const maxRad = (maxAngle * Math.PI) / 180;

    // Create arc showing valid range
    const arcAngle = maxRad - minRad;
    const arcGeometry = new THREE.TorusGeometry(
      size * 1.1,
      size * 0.03,
      4,
      Math.max(8, Math.floor(Math.abs(arcAngle) * 10)),
      arcAngle
    );

    const arcMaterial = new THREE.MeshBasicMaterial({
      color: this.options.colors.limit,
      transparent: true,
      opacity: this.options.opacity * 0.8,
    });

    const arc = new THREE.Mesh(arcGeometry, arcMaterial);
    arc.rotation.z = minRad;

    // Orient to match constraint axis
    const axisVec = new THREE.Vector3(axis[0], axis[1], axis[2]).normalize();
    const defaultAxis = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultAxis, axisVec);
    this.limitIndicators.quaternion.copy(quaternion);

    this.limitIndicators.add(arc);

    // Add limit markers at min and max
    const markerGeometry = new THREE.SphereGeometry(size * 0.05, 8, 8);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: this.options.colors.limit,
    });

    const minMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    minMarker.position.set(
      Math.cos(minRad) * size * 1.1,
      Math.sin(minRad) * size * 1.1,
      0
    );
    this.limitIndicators.add(minMarker);

    const maxMarker = new THREE.Mesh(markerGeometry, markerMaterial.clone());
    maxMarker.position.set(
      Math.cos(maxRad) * size * 1.1,
      Math.sin(maxRad) * size * 1.1,
      0
    );
    this.limitIndicators.add(maxMarker);

    this.group.add(this.limitIndicators);
  }

  /**
   * Create visual indicators for translation limits
   */
  private createTranslationLimits(range: [number, number], axis: Vector3, size: number): void {
    this.limitIndicators = new THREE.Group();

    const [min, max] = range;
    const axisVec = new THREE.Vector3(axis[0], axis[1], axis[2]).normalize();

    // Create markers at min and max positions
    const markerGeometry = new THREE.BoxGeometry(size * 0.1, size * 0.1, size * 0.02);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: this.options.colors.limit,
      transparent: true,
      opacity: this.options.opacity,
    });

    // Min marker
    const minMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    minMarker.position.copy(axisVec.clone().multiplyScalar(min));
    this.limitIndicators.add(minMarker);

    // Max marker
    const maxMarker = new THREE.Mesh(markerGeometry, markerMaterial.clone());
    maxMarker.position.copy(axisVec.clone().multiplyScalar(max));
    this.limitIndicators.add(maxMarker);

    // Connect with dashed line
    const points = [
      axisVec.clone().multiplyScalar(min),
      axisVec.clone().multiplyScalar(max),
    ];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineDashedMaterial({
      color: this.options.colors.limit,
      dashSize: size * 0.1,
      gapSize: size * 0.05,
      transparent: true,
      opacity: this.options.opacity * 0.5,
    });

    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.computeLineDistances();
    this.limitIndicators.add(line);

    this.group.add(this.limitIndicators);
  }
}

/**
 * Create a gizmo with default options
 */
export function createGizmo(options?: GizmoOptions): TransformGizmo {
  return new TransformGizmo(options);
}
