/**
 * Three.js Utilities for 3D Visualization
 * Handles scene setup, geometry rendering, and camera controls
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GeometryResponse } from './api-client';

export interface SceneConfig {
  container: HTMLElement;
  width: number;
  height: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private mesh: THREE.Mesh | null = null;
  private animationId: number | null = null;

  constructor(config: SceneConfig) {
    // Scene setup - Blender dark theme
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x303030);
    this.scene.fog = new THREE.Fog(0x303030, 1000, 3000);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(75, config.width / config.height, 0.1, 3000);
    this.camera.position.set(50, 50, 50);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(config.width, config.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    config.container.appendChild(this.renderer.domElement);

    // Lighting
    this.setupLighting();

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 2;

    // Grid helper - Blender style
    const gridHelper = new THREE.GridHelper(200, 20, 0x434343, 0x282828);
    this.scene.add(gridHelper);

    // Axis helper
    const axisHelper = new THREE.AxesHelper(100);
    this.scene.add(axisHelper);

    // Start animation loop
    this.animate();

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize(config));
  }

  /**
   * Setup lighting
   */
  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    directionalLight.shadow.camera.far = 1000;
    this.scene.add(directionalLight);

    // Point light
    const pointLight = new THREE.PointLight(0x0088ff, 0.3);
    pointLight.position.set(-50, 100, 50);
    this.scene.add(pointLight);
  }

  /**
   * Render geometry from vertices and indices
   */
  public renderGeometry(geometry: GeometryResponse): void {
    // Remove existing mesh
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }

    // Create new geometry
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(geometry.vertices), 3));
    bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geometry.indices), 1));
    // Compute normals for flat shading (ignores WASM smooth normals)
    bufferGeometry.computeVertexNormals();

    // Create material - Blender default gray style with flat shading for crisp edges
    const material = new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.1,
      roughness: 0.5,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    // Create mesh
    this.mesh = new THREE.Mesh(bufferGeometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    // Fit view to geometry
    this.fitViewToGeometry(geometry.bounds);
  }

  /**
   * Fit camera view to geometry bounds
   */
  public fitViewToGeometry(bounds: { min: [number, number, number]; max: [number, number, number] }): void {
    const min = new THREE.Vector3(...bounds.min);
    const max = new THREE.Vector3(...bounds.max);
    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    const size = new THREE.Vector3().subVectors(max, min).length();

    // Position camera
    const distance = size / Math.tan((this.camera.fov * Math.PI) / 360);
    const direction = new THREE.Vector3(1, 1, 1).normalize();
    this.camera.position.copy(center.clone().add(direction.clone().multiplyScalar(distance * 1.2)));
    this.camera.lookAt(center);

    // Update controls
    this.controls.target.copy(center);
    this.controls.update();
  }

  /**
   * Reset camera view
   */
  public resetView(): void {
    this.camera.position.set(50, 50, 50);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Toggle grid visibility
   */
  public toggleGrid(): void {
    const gridHelper = this.scene.getObjectByName('grid') as THREE.GridHelper;
    if (gridHelper) {
      gridHelper.visible = !gridHelper.visible;
    }
  }

  /**
   * Get scene statistics
   */
  public getStats(): { fps: number; triangles: number; renderTime: number } {
    const triangles = this.mesh ? (this.mesh.geometry as THREE.BufferGeometry).index?.count || 0 : 0;
    return {
      fps: Math.round(1000 / 16.67), // Approximation
      triangles,
      renderTime: 16.67, // Average frame time
    };
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Handle window resize
   */
  private onWindowResize(config: SceneConfig): void {
    const container = config.container;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
