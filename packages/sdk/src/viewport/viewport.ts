/**
 * Viewport - High-level 3D visualization
 * 
 * Simple wrapper for Three.js rendering of CAD geometries
 */

import * as THREE from 'three';
import type { Geometry, HighlightInfo } from '../shared/types';
import type { SceneConfig, ViewportConfig, ViewportEventHandlers, ViewportStats } from './types';

export class Viewport {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private mesh: THREE.Mesh | null = null;
  private animationId: number | null = null;

  private config: ViewportConfig;
  private eventHandlers: ViewportEventHandlers = {};

  constructor(container: HTMLElement, config: Partial<ViewportConfig> = {}) {
    this.container = container;
    this.config = { 
      enableGrid: true, 
      enableStats: false, 
      enableControls: true,
      backgroundColor: '#000000',
      container,
      width: container.clientWidth,
      height: container.clientHeight,
      ...config 
    };

    this.initScene();
    this.setupLighting();
    this.setupCamera();
    this.setupRenderer();
    this.setupControls();
    
    container.appendChild(this.renderer.domElement);
    this.startRenderLoop();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = this.config.backgroundColor 
      ? new THREE.Color(this.config.backgroundColor)
      : new THREE.Color(0x000000); // Black like OpenSCAD
  }

  private setupLighting(): void {
    // Soft directional light from above/right
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(10, 10, 10);
    this.scene.add(light);

    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
  }

  private setupCamera(): void {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(50, 50, 50);
    this.camera.lookAt(0, 0, 0);
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  private setupControls(): void {
    if (this.config.enableGrid) {
      this.setupGrid();
    }
  }

  private setupGrid(): void {
    const gridHelper = new THREE.GridHelper(100, 10);
    gridHelper.material = new THREE.LineBasicMaterial({ 
      color: 0x404040, 
      transparent: true, 
      opacity: 0.3 
    });
    this.scene.add(gridHelper);
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.render();
    };
    animate();
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Update geometry in viewport
   */
  updateGeometry(geometry: Geometry): void {
    // Clear existing mesh
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (this.mesh.material instanceof THREE.Material) {
        this.mesh.material.dispose();
      }
    }

    // Create new mesh from geometry
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', new THREE.Float32BufferAttribute(geometry.vertices, 3));
    bufferGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(geometry.normals, 3));
    bufferGeometry.setIndex(new THREE.Uint32BufferAttribute(geometry.indices, 1));

    const material = new THREE.MeshPhongMaterial({ 
      color: 0x909090, // CAD green
      specular: 0x111111,
      shininess: 200,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(bufferGeometry, material);
    this.scene.add(this.mesh);

    // Auto-fit camera to geometry
    this.fitCameraToGeometry(geometry);
  }

  /**
   * Auto-adjust camera to view entire geometry
   */
  private fitCameraToGeometry(geometry: Geometry): void {
    if (!geometry.bounds) return;

    const { min, max } = geometry.bounds;
    const center = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2
    ];
    const size = [
      max[0] - min[0],
      max[1] - min[1],
      max[2] - min[2]
    ];
    const maxDim = Math.max(size[0], size[1], size[2]);
    const distance = maxDim * 2;

    this.camera.position.set(
      center[0] + distance * 0.7,
      center[1] + distance * 0.7,
      center[2] + distance * 0.7
    );
    this.camera.lookAt(center[0], center[1], center[2]);
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: ViewportEventHandlers): void {
    this.eventHandlers = handlers;
    this.setupMouseEvents();
  }

  private setupMouseEvents(): void {
    this.container.addEventListener('mousemove', (event: MouseEvent) => {
      // Simple hover detection (would need raycasting for real implementation)
      if (this.eventHandlers.onHover) {
        this.eventHandlers.onHover(null);
      }
    });

    this.container.addEventListener('click', (event: MouseEvent) => {
      // Simple click detection
      if (this.eventHandlers.onSelect) {
        this.eventHandlers.onSelect([]);
      }
    });
  }

  /**
   * Get current viewport stats
   */
  getStats(): ViewportStats {
    return {
      fps: 60, // Would need actual FPS counter
      geometries: this.mesh ? 1 : 0,
      vertices: this.mesh?.geometry.attributes.position?.count || 0,
      triangles: this.mesh?.geometry.index?.count || 0
    };
  }

  /**
   * Resize viewport
   */
  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Dispose viewport
   */
  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (this.mesh.material instanceof THREE.Material) {
        this.mesh.material.dispose();
      }
    }

    this.renderer.dispose();
  }

  /**
   * Get Three.js objects for advanced usage
   */
  getThreeObjects() {
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      mesh: this.mesh
    };
  }
}