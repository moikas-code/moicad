/**
 * Interaction Manager
 *
 * Manages interactive parts in a Three.js scene, handling selection,
 * dragging, constraint solving, and state management.
 */

import * as THREE from 'three';
import { ConstraintSolver, type TransformDelta } from './constraint-solver';
import type {
  InteractiveModel,
  InteractivePart,
  PartState,
  Transform,
  Vector3,
  InteractionManagerOptions,
  InteractionEvents,
  SerializedModelState,
} from './types';
import type { Geometry } from '../types';

/**
 * Interaction Manager - handles interactive parts in a Three.js scene
 */
export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;

  private parts: Map<string, InteractivePart> = new Map();
  private meshes: Map<string, THREE.Mesh> = new Map();
  private states: Map<string, PartState> = new Map();

  private solver: ConstraintSolver;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private selectedPartId: string | null = null;
  private hoveredPartId: string | null = null;
  private isDragging: boolean = false;
  private dragStartPos: THREE.Vector3 = new THREE.Vector3();
  private dragPlane: THREE.Plane = new THREE.Plane();

  private options: Required<InteractionManagerOptions>;
  private events: InteractionEvents;

  private animationFrameId: number | null = null;
  private enabled: boolean = true;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    options: InteractionManagerOptions = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.solver = new ConstraintSolver();
    this.raycaster = new THREE.Raycaster();

    // Default options
    this.options = {
      enabled: options.enabled !== false,
      showGizmos: options.showGizmos !== false,
      gizmoSize: options.gizmoSize || 50,
      selectionColor: options.selectionColor || '#00ffff',
      hoverColor: options.hoverColor || '#ffff00',
      multiSelect: options.multiSelect || false,
      snapToGrid: options.snapToGrid || false,
      gridSize: options.gridSize || 1,
      events: options.events || {},
    };

    this.events = options.events || {};
    this.enabled = this.options.enabled;

    this.setupEventListeners();
  }

  /**
   * Load an interactive model
   */
  loadModel(model: InteractiveModel): void {
    this.clear();

    for (const part of model.parts) {
      this.addPart(part);
    }
  }

  /**
   * Add a single part
   */
  addPart(part: InteractivePart): void {
    // Store part definition
    this.parts.set(part.id, part);

    // Create mesh from shape geometry
    const geometry = part.shape.getGeometry();
    const mesh = this.createMeshFromGeometry(geometry, part);

    // Apply initial transform
    if (part.initialTransform) {
      if (part.initialTransform.position) {
        mesh.position.set(...part.initialTransform.position);
      }
      if (part.initialTransform.rotation) {
        mesh.rotation.set(
          THREE.MathUtils.degToRad(part.initialTransform.rotation[0]),
          THREE.MathUtils.degToRad(part.initialTransform.rotation[1]),
          THREE.MathUtils.degToRad(part.initialTransform.rotation[2])
        );
      }
      if (part.initialTransform.scale) {
        mesh.scale.set(...part.initialTransform.scale);
      }
    }

    mesh.userData.partId = part.id;
    mesh.userData.constraint = part.constraint;

    this.meshes.set(part.id, mesh);
    this.scene.add(mesh);

    // Initialize state
    this.states.set(part.id, {
      id: part.id,
      transform: {
        position: [mesh.position.x, mesh.position.y, mesh.position.z],
        rotation: [
          THREE.MathUtils.radToDeg(mesh.rotation.x),
          THREE.MathUtils.radToDeg(mesh.rotation.y),
          THREE.MathUtils.radToDeg(mesh.rotation.z),
        ],
        scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z],
      },
      value: 0,
      isDragging: false,
      isAnimating: false,
    });
  }

  /**
   * Create Three.js mesh from moicad Geometry
   */
  private createMeshFromGeometry(geometry: Geometry, part: InteractivePart): THREE.Mesh {
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(geometry.vertices, 3)
    );
    bufferGeometry.setIndex(new THREE.Uint32BufferAttribute(geometry.indices, 1));

    if (geometry.normals && geometry.normals.length > 0) {
      bufferGeometry.setAttribute(
        'normal',
        new THREE.Float32BufferAttribute(geometry.normals, 3)
      );
    } else {
      bufferGeometry.computeVertexNormals();
    }

    // Determine color
    let color = 0x808080;
    if (part.color) {
      if (typeof part.color === 'string') {
        color = new THREE.Color(part.color).getHex();
      } else {
        color = new THREE.Color(part.color[0], part.color[1], part.color[2]).getHex();
      }
    }

    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.1,
      roughness: 0.5,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(bufferGeometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  /**
   * Clear all parts
   */
  clear(): void {
    for (const mesh of this.meshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }

    this.parts.clear();
    this.meshes.clear();
    this.states.clear();
    this.selectedPartId = null;
    this.hoveredPartId = null;
  }

  /**
   * Setup mouse/touch event listeners
   */
  private setupEventListeners(): void {
    const domElement = this.renderer.domElement;

    domElement.addEventListener('pointerdown', this.onPointerDown);
    domElement.addEventListener('pointermove', this.onPointerMove);
    domElement.addEventListener('pointerup', this.onPointerUp);
    domElement.addEventListener('pointerleave', this.onPointerUp);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    const domElement = this.renderer.domElement;

    domElement.removeEventListener('pointerdown', this.onPointerDown);
    domElement.removeEventListener('pointermove', this.onPointerMove);
    domElement.removeEventListener('pointerup', this.onPointerUp);
    domElement.removeEventListener('pointerleave', this.onPointerUp);
  }

  /**
   * Update mouse position for raycasting
   */
  private updateMouse(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Raycast to find intersected parts
   */
  private raycastParts(): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshArray = Array.from(this.meshes.values());
    return this.raycaster.intersectObjects(meshArray);
  }

  /**
   * Handle pointer down event
   */
  private onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;

    this.updateMouse(event);
    const intersects = this.raycastParts();

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const partId = mesh.userData.partId;

      if (partId) {
        const part = this.parts.get(partId);

        // Don't select fixed parts
        if (part?.constraint?.type === 'fixed') {
          return;
        }

        // Select the part
        this.selectPart(partId);

        // Start dragging
        this.isDragging = true;
        this.dragStartPos.copy(intersects[0].point);

        // Create drag plane perpendicular to camera
        const cameraDir = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDir);
        this.dragPlane.setFromNormalAndCoplanarPoint(cameraDir, intersects[0].point);

        // Update state
        const state = this.states.get(partId);
        if (state) {
          state.isDragging = true;
          this.events.onDragStart?.(partId);
        }
      }
    } else {
      // Click on empty space - deselect
      this.selectPart(null);
    }
  };

  /**
   * Handle pointer move event
   */
  private onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled) return;

    this.updateMouse(event);

    if (this.isDragging && this.selectedPartId) {
      // Calculate drag delta
      const intersectPoint = new THREE.Vector3();
      this.raycaster.setFromCamera(this.mouse, this.camera);
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

      const delta = intersectPoint.clone().sub(this.dragStartPos);
      this.dragStartPos.copy(intersectPoint);

      // Apply constraint and update transform
      this.applyDelta(this.selectedPartId, {
        position: [delta.x, delta.y, delta.z],
      });
    } else {
      // Hover detection
      const intersects = this.raycastParts();
      const newHoveredId = intersects.length > 0
        ? (intersects[0].object as THREE.Mesh).userData.partId
        : null;

      if (newHoveredId !== this.hoveredPartId) {
        // Update hover highlight
        if (this.hoveredPartId) {
          this.setPartHighlight(this.hoveredPartId, false, 'hover');
        }
        if (newHoveredId) {
          this.setPartHighlight(newHoveredId, true, 'hover');
        }
        this.hoveredPartId = newHoveredId;
      }
    }
  };

  /**
   * Handle pointer up event
   */
  private onPointerUp = (): void => {
    if (this.isDragging && this.selectedPartId) {
      const state = this.states.get(this.selectedPartId);
      if (state) {
        state.isDragging = false;
        this.events.onDragEnd?.(this.selectedPartId);

        // Check for spring back
        const part = this.parts.get(this.selectedPartId);
        if (part?.constraint?.springBack) {
          this.startSpringBackAnimation(this.selectedPartId);
        }
      }
    }

    this.isDragging = false;
  };

  /**
   * Select a part
   */
  selectPart(partId: string | null): void {
    // Deselect previous
    if (this.selectedPartId && this.selectedPartId !== partId) {
      this.setPartHighlight(this.selectedPartId, false, 'select');
    }

    this.selectedPartId = partId;

    // Select new
    if (partId) {
      this.setPartHighlight(partId, true, 'select');
    }

    this.events.onSelect?.(partId);
  }

  /**
   * Set highlight on a part
   */
  private setPartHighlight(partId: string, highlight: boolean, type: 'select' | 'hover'): void {
    const mesh = this.meshes.get(partId);
    if (!mesh) return;

    const material = mesh.material as THREE.MeshStandardMaterial;

    if (highlight) {
      const color = type === 'select' ? this.options.selectionColor : this.options.hoverColor;
      material.emissive = new THREE.Color(color);
      material.emissiveIntensity = type === 'select' ? 0.3 : 0.15;
    } else {
      // Only remove highlight if this type was active
      if (type === 'select' && this.selectedPartId === partId) return;
      if (type === 'hover' && this.hoveredPartId === partId) return;

      material.emissive = new THREE.Color(0x000000);
      material.emissiveIntensity = 0;
    }
  }

  /**
   * Apply a transform delta to a part
   */
  applyDelta(partId: string, delta: TransformDelta): void {
    const part = this.parts.get(partId);
    const mesh = this.meshes.get(partId);
    const state = this.states.get(partId);

    if (!part || !mesh || !state || !part.constraint) return;

    // Apply constraint
    const result = this.solver.applyConstraint(
      part.constraint,
      state.transform,
      delta,
      state.value
    );

    // Check for limit
    const limit = this.solver.isAtLimit(part.constraint, result.value);
    if (limit) {
      this.events.onLimitReached?.(partId, limit);
    }

    // Apply snap
    const snappedValue = this.solver.applySnap(part.constraint, result.value);
    if (snappedValue !== result.value) {
      this.events.onSnap?.(partId, snappedValue);
      result.value = snappedValue;
    }

    // Update state
    state.transform = result.transform;
    state.value = result.value;

    // Apply to mesh
    mesh.position.set(...result.transform.position);
    mesh.rotation.set(
      THREE.MathUtils.degToRad(result.transform.rotation[0]),
      THREE.MathUtils.degToRad(result.transform.rotation[1]),
      THREE.MathUtils.degToRad(result.transform.rotation[2])
    );

    // Update linked parts
    if (part.linkedTo) {
      this.updateLinkedPart(partId, delta);
    }

    // Emit change event
    this.events.onTransformChange?.(partId, result.transform, result.value);
  }

  /**
   * Update a part that's linked to another
   */
  private updateLinkedPart(sourcePartId: string, sourceDelta: TransformDelta): void {
    const sourcePart = this.parts.get(sourcePartId);
    if (!sourcePart?.linkedTo) return;

    const linkedPartId = sourcePart.linkedTo.partId;
    const ratio = sourcePart.linkedTo.ratio;

    // Calculate linked delta
    const linkedDelta: TransformDelta = {};

    if (sourceDelta.position) {
      linkedDelta.position = [
        sourceDelta.position[0] * ratio,
        sourceDelta.position[1] * ratio,
        sourceDelta.position[2] * ratio,
      ];
    }

    if (sourceDelta.rotation) {
      linkedDelta.rotation = [
        sourceDelta.rotation[0] * ratio,
        sourceDelta.rotation[1] * ratio,
        sourceDelta.rotation[2] * ratio,
      ];
    }

    // Apply to linked part (avoid infinite recursion)
    const linkedPart = this.parts.get(linkedPartId);
    if (linkedPart && linkedPart.linkedTo?.partId !== sourcePartId) {
      this.applyDelta(linkedPartId, linkedDelta);
    }
  }

  /**
   * Start spring-back animation for a part
   */
  private startSpringBackAnimation(partId: string): void {
    const state = this.states.get(partId);
    const part = this.parts.get(partId);

    if (!state || !part?.constraint?.springBack) return;

    state.isAnimating = true;

    const animate = () => {
      if (!state.isAnimating) return;

      const newValue = this.solver.applySpringBack(
        part.constraint!,
        state.value,
        0, // Initial value
        16 // ~60fps
      );

      // Check if animation is complete
      if (Math.abs(newValue - 0) < 0.1) {
        state.isAnimating = false;
        state.value = 0;
        this.updateMeshFromState(partId);
        return;
      }

      // Calculate delta
      const delta = newValue - state.value;

      // Apply the delta
      const axis = part.constraint?.axis || [0, 0, 1];
      if (part.constraint?.type === 'slider') {
        this.applyDelta(partId, {
          position: [
            axis[0] * delta,
            axis[1] * delta,
            axis[2] * delta,
          ],
        });
      } else {
        this.applyDelta(partId, {
          rotation: [
            axis[0] * delta,
            axis[1] * delta,
            axis[2] * delta,
          ],
        });
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Update mesh position/rotation from state
   */
  private updateMeshFromState(partId: string): void {
    const state = this.states.get(partId);
    const mesh = this.meshes.get(partId);

    if (!state || !mesh) return;

    mesh.position.set(...state.transform.position);
    mesh.rotation.set(
      THREE.MathUtils.degToRad(state.transform.rotation[0]),
      THREE.MathUtils.degToRad(state.transform.rotation[1]),
      THREE.MathUtils.degToRad(state.transform.rotation[2])
    );
  }

  /**
   * Reset all parts to initial state
   */
  resetAll(): void {
    for (const [partId, part] of this.parts) {
      const state = this.states.get(partId);
      const mesh = this.meshes.get(partId);

      if (!state || !mesh) continue;

      // Reset transform
      state.transform = {
        position: part.initialTransform?.position || [0, 0, 0],
        rotation: part.initialTransform?.rotation || [0, 0, 0],
        scale: part.initialTransform?.scale || [1, 1, 1],
      };
      state.value = 0;
      state.isAnimating = false;

      // Apply to mesh
      this.updateMeshFromState(partId);
    }

    this.events.onStateChange?.(Object.fromEntries(this.states));
  }

  /**
   * Reset a single part
   */
  resetPart(partId: string): void {
    const part = this.parts.get(partId);
    const state = this.states.get(partId);

    if (!part || !state) return;

    state.transform = {
      position: part.initialTransform?.position || [0, 0, 0],
      rotation: part.initialTransform?.rotation || [0, 0, 0],
      scale: part.initialTransform?.scale || [1, 1, 1],
    };
    state.value = 0;
    state.isAnimating = false;

    this.updateMeshFromState(partId);
    this.events.onTransformChange?.(partId, state.transform, state.value);
  }

  /**
   * Get current state of all parts
   */
  getState(): Record<string, PartState> {
    return Object.fromEntries(this.states);
  }

  /**
   * Get state of a single part
   */
  getPartState(partId: string): PartState | undefined {
    return this.states.get(partId);
  }

  /**
   * Serialize model state for save/load
   */
  serializeState(): SerializedModelState {
    const parts: Record<string, { value: number; transform: Transform }> = {};

    for (const [partId, state] of this.states) {
      parts[partId] = {
        value: state.value,
        transform: state.transform,
      };
    }

    return {
      version: 1,
      timestamp: Date.now(),
      parts,
    };
  }

  /**
   * Restore model state from serialized data
   */
  deserializeState(data: SerializedModelState): void {
    for (const [partId, partData] of Object.entries(data.parts)) {
      const state = this.states.get(partId);
      if (!state) continue;

      state.value = partData.value;
      state.transform = partData.transform;

      this.updateMeshFromState(partId);
    }

    this.events.onStateChange?.(Object.fromEntries(this.states));
  }

  /**
   * Enable/disable interactions
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (!enabled) {
      this.isDragging = false;
      this.selectedPartId = null;
      this.hoveredPartId = null;
    }
  }

  /**
   * Get currently selected part ID
   */
  getSelectedPartId(): string | null {
    return this.selectedPartId;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.removeEventListeners();
    this.clear();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
