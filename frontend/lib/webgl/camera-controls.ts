/**
 * Camera Controls for WebGL Renderer
 * Provides orbit, pan, and zoom functionality similar to Three.js OrbitControls
 */

import { Vec3, vec3Add, vec3Sub, vec3Scale, vec3Normalize, vec3Cross, vec3Length } from './math';

export interface CameraState {
  position: Vec3;
  target: Vec3;
  up: Vec3;
}

export class CameraControls {
  private canvas: HTMLCanvasElement;
  private state: CameraState;

  // Orbit parameters
  private theta: number; // Horizontal angle (around Z axis)
  private phi: number;   // Vertical angle (from Z axis)
  private radius: number;

  // Interaction state
  private isDragging = false;
  private isPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Settings
  private rotateSpeed = 0.005;
  private panSpeed = 0.5;
  private zoomSpeed = 0.1;
  private minRadius = 1;
  private maxRadius = 5000;
  private minPhi = 0.01;
  private maxPhi = Math.PI - 0.01;

  // Callback
  private onChange?: () => void;

  constructor(canvas: HTMLCanvasElement, initialState?: Partial<CameraState>) {
    this.canvas = canvas;

    // Default camera state
    this.state = {
      position: initialState?.position || [100, 100, 100],
      target: initialState?.target || [0, 0, 0],
      up: initialState?.up || [0, 0, 1], // Z-up
    };

    // Calculate initial spherical coordinates
    const offset = vec3Sub(this.state.position, this.state.target);
    this.radius = vec3Length(offset);
    this.theta = Math.atan2(offset[1], offset[0]);
    this.phi = Math.acos(Math.max(-1, Math.min(1, offset[2] / this.radius)));

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown = (e: MouseEvent): void => {
    e.preventDefault();

    if (e.button === 0) {
      // Left click: orbit
      this.isDragging = true;
    } else if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
      // Right click or Shift+Left: pan
      this.isPanning = true;
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging && !this.isPanning) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    if (this.isDragging) {
      this.orbit(deltaX, deltaY);
    } else if (this.isPanning) {
      this.pan(deltaX, deltaY);
    }
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.isPanning = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 1 : -1;
    this.zoom(delta);
  };

  private orbit(deltaX: number, deltaY: number): void {
    this.theta -= deltaX * this.rotateSpeed;
    this.phi += deltaY * this.rotateSpeed;

    // Clamp phi to prevent flipping
    this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi));

    this.updatePosition();
  }

  private pan(deltaX: number, deltaY: number): void {
    // Calculate camera right and up vectors
    const offset = vec3Sub(this.state.position, this.state.target);
    const forward = vec3Normalize(vec3Scale(offset, -1));
    const right = vec3Normalize(vec3Cross(forward, this.state.up));
    const up = vec3Cross(right, forward);

    // Scale pan amount by distance
    const scale = this.radius * this.panSpeed * 0.001;

    // Calculate pan offset
    const panX = vec3Scale(right, -deltaX * scale);
    const panY = vec3Scale(up, deltaY * scale);
    const panOffset = vec3Add(panX, panY);

    // Apply to both position and target
    this.state.position = vec3Add(this.state.position, panOffset);
    this.state.target = vec3Add(this.state.target, panOffset);

    this.notifyChange();
  }

  private zoom(delta: number): void {
    const factor = 1 + delta * this.zoomSpeed;
    this.radius *= factor;
    this.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.radius));

    this.updatePosition();
  }

  private updatePosition(): void {
    // Convert spherical to Cartesian (Z-up)
    const x = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
    const y = this.radius * Math.sin(this.phi) * Math.sin(this.theta);
    const z = this.radius * Math.cos(this.phi);

    this.state.position = vec3Add(this.state.target, [x, y, z]);

    this.notifyChange();
  }

  private notifyChange(): void {
    if (this.onChange) {
      this.onChange();
    }
  }

  setOnChange(callback: () => void): void {
    this.onChange = callback;
  }

  getState(): CameraState {
    return { ...this.state };
  }

  setTarget(target: Vec3): void {
    const offset = vec3Sub(this.state.position, this.state.target);
    this.state.target = target;
    this.state.position = vec3Add(target, offset);
    this.notifyChange();
  }

  reset(position?: Vec3, target?: Vec3): void {
    this.state.position = position || [100, 100, 100];
    this.state.target = target || [0, 0, 0];

    const offset = vec3Sub(this.state.position, this.state.target);
    this.radius = vec3Length(offset);
    this.theta = Math.atan2(offset[1], offset[0]);
    this.phi = Math.acos(Math.max(-1, Math.min(1, offset[2] / this.radius)));

    this.notifyChange();
  }

  // Fit camera to bounding box
  fitToBounds(min: Vec3, max: Vec3, padding = 1.5): void {
    const center: Vec3 = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ];

    const size = Math.max(
      max[0] - min[0],
      max[1] - min[1],
      max[2] - min[2]
    );

    this.state.target = center;
    this.radius = size * padding;
    this.updatePosition();
  }

  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }
}
