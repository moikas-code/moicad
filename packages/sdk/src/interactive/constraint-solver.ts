/**
 * Constraint Solver
 *
 * Applies constraints to transforms, limiting movement based on constraint type.
 * Handles hinge (rotation), slider (translation), ball joint, and more.
 */

import * as THREE from 'three';
import type { Constraint, Transform, Vector3 } from './types';

/**
 * Delta transform - change in position/rotation
 */
export interface TransformDelta {
  position?: Vector3;
  rotation?: Vector3;  // Euler angles in degrees
}

/**
 * Constraint solver - applies constraints to transforms
 */
export class ConstraintSolver {
  /**
   * Apply constraint to a proposed transform change
   *
   * @param constraint - Constraint definition
   * @param current - Current transform state
   * @param delta - Proposed change
   * @param currentValue - Current constraint value (angle or distance)
   * @returns New transform and constraint value
   */
  applyConstraint(
    constraint: Constraint,
    current: Transform,
    delta: TransformDelta,
    currentValue: number = 0
  ): { transform: Transform; value: number } {
    switch (constraint.type) {
      case 'fixed':
        // No movement allowed
        return { transform: current, value: 0 };

      case 'hinge':
        return this.solveHinge(constraint, current, delta, currentValue);

      case 'slider':
        return this.solveSlider(constraint, current, delta, currentValue);

      case 'ball':
        return this.solveBall(constraint, current, delta, currentValue);

      case 'piston':
        return this.solvePiston(constraint, current, delta, currentValue);

      case 'planar':
        return this.solvePlanar(constraint, current, delta, currentValue);

      case 'free':
        return this.solveFree(current, delta, currentValue);

      default:
        return { transform: current, value: currentValue };
    }
  }

  /**
   * Solve hinge constraint - rotation around a single axis
   */
  private solveHinge(
    constraint: Constraint,
    current: Transform,
    delta: TransformDelta,
    currentValue: number
  ): { transform: Transform; value: number } {
    const axis = new THREE.Vector3(...(constraint.axis || [0, 0, 1]));
    const pivot = new THREE.Vector3(...(constraint.pivot || [0, 0, 0]));

    // Calculate rotation angle from delta
    let deltaAngle = 0;

    if (delta.rotation) {
      // Project delta rotation onto constraint axis
      const deltaEuler = new THREE.Euler(
        THREE.MathUtils.degToRad(delta.rotation[0]),
        THREE.MathUtils.degToRad(delta.rotation[1]),
        THREE.MathUtils.degToRad(delta.rotation[2])
      );
      const deltaQuat = new THREE.Quaternion().setFromEuler(deltaEuler);

      // Get angle around constraint axis
      deltaAngle = this.getAngleAroundAxis(deltaQuat, axis);
    }

    if (delta.position) {
      // Convert position delta to rotation angle
      // Project position onto perpendicular plane and calculate angle
      const posDelta = new THREE.Vector3(...delta.position);
      const perpendicular = posDelta.clone().sub(
        axis.clone().multiplyScalar(posDelta.dot(axis))
      );

      // Estimate angle from position movement
      const distance = perpendicular.length();
      const leverArm = pivot.distanceTo(new THREE.Vector3(...current.position));
      if (leverArm > 0.01) {
        deltaAngle += THREE.MathUtils.radToDeg(distance / leverArm) *
          Math.sign(perpendicular.dot(new THREE.Vector3(1, 1, 1).cross(axis)));
      }
    }

    // Calculate new value (angle)
    let newValue = currentValue + deltaAngle;

    // Clamp to range
    if (constraint.range) {
      newValue = Math.max(constraint.range[0], Math.min(constraint.range[1], newValue));
    }

    // Apply damping
    if (constraint.damping) {
      const actualDelta = newValue - currentValue;
      newValue = currentValue + actualDelta * (1 - constraint.damping);
    }

    // Calculate new transform
    const newTransform = this.rotateAroundPivot(
      current,
      axis,
      pivot,
      newValue - currentValue
    );

    return { transform: newTransform, value: newValue };
  }

  /**
   * Solve slider constraint - translation along a single axis
   */
  private solveSlider(
    constraint: Constraint,
    current: Transform,
    delta: TransformDelta,
    currentValue: number
  ): { transform: Transform; value: number } {
    const axis = new THREE.Vector3(...(constraint.axis || [0, 1, 0])).normalize();

    // Calculate translation along axis
    let deltaDistance = 0;

    if (delta.position) {
      const posDelta = new THREE.Vector3(...delta.position);
      deltaDistance = posDelta.dot(axis);
    }

    // Calculate new value (distance)
    let newValue = currentValue + deltaDistance;

    // Clamp to range
    if (constraint.range) {
      newValue = Math.max(constraint.range[0], Math.min(constraint.range[1], newValue));
    }

    // Apply damping
    if (constraint.damping) {
      const actualDelta = newValue - currentValue;
      newValue = currentValue + actualDelta * (1 - constraint.damping);
    }

    // Calculate new position
    const translation = axis.clone().multiplyScalar(newValue - currentValue);
    const newPosition: Vector3 = [
      current.position[0] + translation.x,
      current.position[1] + translation.y,
      current.position[2] + translation.z,
    ];

    return {
      transform: { ...current, position: newPosition },
      value: newValue,
    };
  }

  /**
   * Solve ball joint constraint - free rotation around pivot
   */
  private solveBall(
    constraint: Constraint,
    current: Transform,
    delta: TransformDelta,
    currentValue: number
  ): { transform: Transform; value: number } {
    const pivot = new THREE.Vector3(...(constraint.pivot || [0, 0, 0]));

    // Apply rotation delta
    let newRotation = [...current.rotation] as Vector3;

    if (delta.rotation) {
      newRotation = [
        current.rotation[0] + delta.rotation[0],
        current.rotation[1] + delta.rotation[1],
        current.rotation[2] + delta.rotation[2],
      ];
    }

    // Calculate total rotation magnitude for range limiting
    const totalAngle = Math.sqrt(
      newRotation[0] * newRotation[0] +
      newRotation[1] * newRotation[1] +
      newRotation[2] * newRotation[2]
    );

    // Clamp total angle if range is specified
    if (constraint.range && totalAngle > constraint.range[1]) {
      const scale = constraint.range[1] / totalAngle;
      newRotation = [
        newRotation[0] * scale,
        newRotation[1] * scale,
        newRotation[2] * scale,
      ];
    }

    // Calculate new position based on rotation around pivot
    const currentPos = new THREE.Vector3(...current.position);
    const offset = currentPos.clone().sub(pivot);

    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(newRotation[0]),
      THREE.MathUtils.degToRad(newRotation[1]),
      THREE.MathUtils.degToRad(newRotation[2])
    );

    offset.applyEuler(euler);
    const newPos = pivot.clone().add(offset);

    return {
      transform: {
        position: [newPos.x, newPos.y, newPos.z],
        rotation: newRotation,
        scale: current.scale,
      },
      value: totalAngle,
    };
  }

  /**
   * Solve piston constraint - translation with rotation
   */
  private solvePiston(
    constraint: Constraint,
    current: Transform,
    delta: TransformDelta,
    currentValue: number
  ): { transform: Transform; value: number } {
    // Piston is like slider but also allows rotation around slide axis
    const sliderResult = this.solveSlider(constraint, current, delta, currentValue);

    // Allow rotation around the slider axis
    const axis = new THREE.Vector3(...(constraint.axis || [0, 1, 0])).normalize();

    if (delta.rotation) {
      const rotationAroundAxis = this.projectRotationToAxis(delta.rotation, axis);
      sliderResult.transform.rotation = [
        sliderResult.transform.rotation[0] + rotationAroundAxis[0],
        sliderResult.transform.rotation[1] + rotationAroundAxis[1],
        sliderResult.transform.rotation[2] + rotationAroundAxis[2],
      ];
    }

    return sliderResult;
  }

  /**
   * Solve planar constraint - movement within a 2D plane
   */
  private solvePlanar(
    constraint: Constraint,
    current: Transform,
    delta: TransformDelta,
    currentValue: number
  ): { transform: Transform; value: number } {
    // Axis defines the plane normal
    const normal = new THREE.Vector3(...(constraint.axis || [0, 0, 1])).normalize();

    let newPosition = [...current.position] as Vector3;

    if (delta.position) {
      const posDelta = new THREE.Vector3(...delta.position);

      // Project delta onto plane (remove component along normal)
      const projectedDelta = posDelta.clone().sub(
        normal.clone().multiplyScalar(posDelta.dot(normal))
      );

      newPosition = [
        current.position[0] + projectedDelta.x,
        current.position[1] + projectedDelta.y,
        current.position[2] + projectedDelta.z,
      ];
    }

    return {
      transform: { ...current, position: newPosition },
      value: currentValue,
    };
  }

  /**
   * Solve free constraint - no restrictions
   */
  private solveFree(
    current: Transform,
    delta: TransformDelta,
    currentValue: number
  ): { transform: Transform; value: number } {
    let newPosition = [...current.position] as Vector3;
    let newRotation = [...current.rotation] as Vector3;

    if (delta.position) {
      newPosition = [
        current.position[0] + delta.position[0],
        current.position[1] + delta.position[1],
        current.position[2] + delta.position[2],
      ];
    }

    if (delta.rotation) {
      newRotation = [
        current.rotation[0] + delta.rotation[0],
        current.rotation[1] + delta.rotation[1],
        current.rotation[2] + delta.rotation[2],
      ];
    }

    return {
      transform: { position: newPosition, rotation: newRotation, scale: current.scale },
      value: currentValue,
    };
  }

  /**
   * Rotate transform around a pivot point
   */
  private rotateAroundPivot(
    current: Transform,
    axis: THREE.Vector3,
    pivot: THREE.Vector3,
    angleDegrees: number
  ): Transform {
    const angleRad = THREE.MathUtils.degToRad(angleDegrees);

    // Create rotation quaternion
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(axis, angleRad);

    // Rotate position around pivot
    const pos = new THREE.Vector3(...current.position);
    const offset = pos.clone().sub(pivot);
    offset.applyQuaternion(rotQuat);
    const newPos = pivot.clone().add(offset);

    // Update rotation (add rotation around axis)
    const currentEuler = new THREE.Euler(
      THREE.MathUtils.degToRad(current.rotation[0]),
      THREE.MathUtils.degToRad(current.rotation[1]),
      THREE.MathUtils.degToRad(current.rotation[2])
    );
    const currentQuat = new THREE.Quaternion().setFromEuler(currentEuler);
    currentQuat.premultiply(rotQuat);
    const newEuler = new THREE.Euler().setFromQuaternion(currentQuat);

    return {
      position: [newPos.x, newPos.y, newPos.z],
      rotation: [
        THREE.MathUtils.radToDeg(newEuler.x),
        THREE.MathUtils.radToDeg(newEuler.y),
        THREE.MathUtils.radToDeg(newEuler.z),
      ],
      scale: current.scale,
    };
  }

  /**
   * Get rotation angle around a specific axis from quaternion
   */
  private getAngleAroundAxis(quat: THREE.Quaternion, axis: THREE.Vector3): number {
    // Project quaternion rotation onto axis
    const rotAxis = new THREE.Vector3(quat.x, quat.y, quat.z);
    const projLength = rotAxis.dot(axis);

    if (Math.abs(projLength) < 0.001) {
      return 0;
    }

    // Calculate angle
    const angle = 2 * Math.atan2(projLength, quat.w);
    return THREE.MathUtils.radToDeg(angle);
  }

  /**
   * Project rotation to only affect rotation around specified axis
   */
  private projectRotationToAxis(rotation: Vector3, axis: THREE.Vector3): Vector3 {
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(rotation[0]),
      THREE.MathUtils.degToRad(rotation[1]),
      THREE.MathUtils.degToRad(rotation[2])
    );
    const quat = new THREE.Quaternion().setFromEuler(euler);

    const angle = this.getAngleAroundAxis(quat, axis);

    // Create rotation only around the specified axis
    const projectedQuat = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(angle));
    const projectedEuler = new THREE.Euler().setFromQuaternion(projectedQuat);

    return [
      THREE.MathUtils.radToDeg(projectedEuler.x),
      THREE.MathUtils.radToDeg(projectedEuler.y),
      THREE.MathUtils.radToDeg(projectedEuler.z),
    ];
  }

  /**
   * Apply spring-back force to return value toward initial position
   */
  applySpringBack(
    constraint: Constraint,
    currentValue: number,
    initialValue: number = 0,
    deltaTime: number = 16 // ms
  ): number {
    if (!constraint.springBack || constraint.springStrength === undefined) {
      return currentValue;
    }

    const strength = constraint.springStrength;
    const diff = initialValue - currentValue;
    const springForce = diff * strength * (deltaTime / 1000) * 10;

    // If very close to initial, snap to it
    if (Math.abs(diff) < 0.1) {
      return initialValue;
    }

    return currentValue + springForce;
  }

  /**
   * Check if value is at constraint limit
   */
  isAtLimit(constraint: Constraint, value: number): 'min' | 'max' | null {
    if (!constraint.range) return null;

    const epsilon = 0.01;
    if (Math.abs(value - constraint.range[0]) < epsilon) return 'min';
    if (Math.abs(value - constraint.range[1]) < epsilon) return 'max';

    return null;
  }

  /**
   * Snap value to nearest snap point if within threshold
   */
  applySnap(constraint: Constraint, value: number): number {
    if (!constraint.snapPoints || constraint.snapPoints.length === 0) {
      return value;
    }

    const threshold = constraint.snapThreshold || 5;

    for (const snapPoint of constraint.snapPoints) {
      if (Math.abs(value - snapPoint) < threshold) {
        return snapPoint;
      }
    }

    return value;
  }
}
