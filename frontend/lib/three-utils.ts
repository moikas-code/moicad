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
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private mesh: THREE.Mesh | null = null;
  private animationId: number | null = null;
  private gridHelper!: THREE.GridHelper;
  private axisHelper!: THREE.AxesHelper;
  private edgesHelper: THREE.LineSegments | null = null;
  private scaleMarkersGroup: THREE.Group | null = null;
  private crosshairGroup: THREE.Group | null = null;
  private isPerspective = true;

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

    // Style canvas to fill container for responsive resizing
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';

    // Lighting
    this.setupLighting();

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 2;

    // Grid helper - Blender style
    this.gridHelper = new THREE.GridHelper(200, 20, 0x434343, 0x282828);
    this.gridHelper.name = 'grid';
    this.scene.add(this.gridHelper);

    // Axis helper
    this.axisHelper = new THREE.AxesHelper(100);
    this.axisHelper.name = 'axes';
    this.scene.add(this.axisHelper);

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
    const fov = this.camera instanceof THREE.PerspectiveCamera ? this.camera.fov : 75;
    const distance = size / Math.tan((fov * Math.PI) / 360);
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
  public toggleGrid(visible?: boolean): void {
    const shouldShow = visible !== undefined ? visible : !this.gridHelper.visible;
    this.gridHelper.visible = shouldShow;
  }

  /**
   * Toggle edges visibility
   */
  public toggleEdges(visible?: boolean): void {
    if (!this.mesh) return;
    
    if (visible !== undefined ? visible : !this.edgesHelper) {
      // Create edges helper
      const edges = new THREE.EdgesGeometry(this.mesh.geometry);
      this.edgesHelper = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
      );
      this.edgesHelper.name = 'edges';
      this.scene.add(this.edgesHelper);
    } else if (this.edgesHelper) {
      // Remove edges helper
      this.scene.remove(this.edgesHelper);
      this.edgesHelper.geometry.dispose();
      (this.edgesHelper.material as THREE.Material).dispose();
      this.edgesHelper = null;
    }
  }

  /**
   * Toggle axes visibility
   */
  public toggleAxes(visible?: boolean): void {
    const shouldShow = visible !== undefined ? visible : !this.axisHelper.visible;
    this.axisHelper.visible = shouldShow;
  }

  /**
   * Toggle scale markers
   */
  public toggleScaleMarkers(visible?: boolean): void {
    const shouldShow = visible !== undefined ? visible : !this.scaleMarkersGroup;
    
    if (shouldShow && !this.scaleMarkersGroup) {
      // Create scale markers
      this.scaleMarkersGroup = new THREE.Group();
      this.scaleMarkersGroup.name = 'scaleMarkers';
      
      // Create axis lines with measurements
      const materials = {
        x: new THREE.LineBasicMaterial({ color: 0xff0000 }),
        y: new THREE.LineBasicMaterial({ color: 0x00ff00 }),
        z: new THREE.LineBasicMaterial({ color: 0x0000ff })
      };
      
      const axisLength = 50;
      const positions = [
        [-axisLength, 0, 0], [axisLength, 0, 0], // X axis
        [0, -axisLength, 0], [0, axisLength, 0], // Y axis
        [0, 0, -axisLength], [0, 0, axisLength]  // Z axis
      ];
      
      positions.forEach((start, i) => {
        if (i % 2 === 0) {
          const end = positions[i + 1];
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...start),
            new THREE.Vector3(...end)
          ]);
          const materialIndex = Math.floor(i / 2);
          const material = materials[materialIndex as unknown as keyof typeof materials];
          const line = new THREE.Line(geometry, material);
          if (this.scaleMarkersGroup) {
            this.scaleMarkersGroup.add(line);
          }
        }
      });
      
      this.scene.add(this.scaleMarkersGroup);
    } else if (!shouldShow && this.scaleMarkersGroup) {
      // Remove scale markers
      this.scene.remove(this.scaleMarkersGroup);
      this.scaleMarkersGroup.traverse((child) => {
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.scaleMarkersGroup = null;
    }
  }

  /**
   * Toggle crosshair
   */
  public toggleCrosshair(visible?: boolean): void {
    const shouldShow = visible !== undefined ? visible : !this.crosshairGroup;
    
    if (shouldShow && !this.crosshairGroup) {
      // Create crosshair
      this.crosshairGroup = new THREE.Group();
      this.crosshairGroup.name = 'crosshair';
      
      const crosshairSize = 20;
      const crosshairGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-crosshairSize, 0, 0),
        new THREE.Vector3(crosshairSize, 0, 0),
        new THREE.Vector3(0, -crosshairSize, 0),
        new THREE.Vector3(0, crosshairSize, 0)
      ]);
      
      const crosshairMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff, 
        linewidth: 2,
        depthTest: false 
      });
      
      const crosshair = new THREE.LineSegments(crosshairGeometry, crosshairMaterial);
      this.crosshairGroup.add(crosshair);
      this.scene.add(this.crosshairGroup);
    } else if (!shouldShow && this.crosshairGroup) {
      // Remove crosshair
      this.scene.remove(this.crosshairGroup);
      this.crosshairGroup.traverse((child) => {
        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.crosshairGroup = null;
    }
  }

  /**
   * Set view orientation
   */
  public setViewOrientation(position: string): void {
    const distance = 100;
    const positions: Record<string, [number, number, number]> = {
      'front': [0, 0, distance],
      'back': [0, 0, -distance],
      'left': [-distance, 0, 0],
      'right': [distance, 0, 0],
      'top': [0, distance, 0],
      'bottom': [0, -distance, 0],
      'diagonal': [distance, distance, distance],
      'center': [distance, distance * 0.5, distance]
    };
    
    const pos = positions[position] || positions.front;
    this.camera.position.set(...pos);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Toggle projection mode
   */
  public setProjectionMode(mode: 'perspective' | 'orthographic'): void {
    if (this.isPerspective === (mode === 'perspective')) return;
    
    const currentCamera = this.camera;
    const aspect = this.renderer.domElement.width / this.renderer.domElement.height;
    
    if (mode === 'orthographic') {
      // Switch to orthographic
      const frustumSize = 100;
      this.camera = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2, frustumSize * aspect / 2,
        frustumSize / 2, -frustumSize / 2,
        0.1, 3000
      );
      this.isPerspective = false;
    } else {
      // Switch to perspective
      this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 3000);
      this.isPerspective = true;
    }
    
    // Copy position and target from old camera
    this.camera.position.copy(currentCamera.position);
    this.camera.lookAt(this.controls.target);
    
    // Update controls and renderer
    this.controls.object = this.camera;
    this.controls.update();
  }

  /**
   * Zoom in
   */
  public zoomIn(): void {
    const zoomFactor = 0.9;
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.position.multiplyScalar(zoomFactor);
    } else {
      // For orthographic camera, adjust frustum size
      const currentZoom = this.camera.zoom;
      this.camera.zoom = Math.min(currentZoom * 1.1, 10);
      this.camera.updateProjectionMatrix();
    }
    this.controls.update();
  }

  /**
   * Zoom out
   */
  public zoomOut(): void {
    const zoomFactor = 1.1;
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.position.multiplyScalar(zoomFactor);
    } else {
      // For orthographic camera, adjust frustum size
      const currentZoom = this.camera.zoom;
      this.camera.zoom = Math.max(currentZoom * 0.9, 0.1);
      this.camera.updateProjectionMatrix();
    }
    this.controls.update();
  }

  /**
   * Zoom to fit
   */
  public zoomToFit(): void {
    if (this.mesh) {
      // Calculate bounding box
      const box = new THREE.Box3().setFromObject(this.mesh);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      // Calculate distance based on size
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 2;
      
      // Position camera
      this.camera.position.copy(center);
      this.camera.position.z += distance;
      this.camera.lookAt(center);
      
      // Update controls
      this.controls.target.copy(center);
      this.controls.update();
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
   * Resize renderer and camera to new dimensions
   */
  public resize(width: number, height: number): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      const aspect = width / height;
      const frustumSize = 100;
      this.camera.left = -frustumSize * aspect / 2;
      this.camera.right = frustumSize * aspect / 2;
      this.camera.top = frustumSize / 2;
      this.camera.bottom = -frustumSize / 2;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.setSize(width, height);

    // Ensure canvas CSS matches (defensive sizing)
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
  }

  /**
   * Handle window resize
   */
  private onWindowResize(config: SceneConfig): void {
    const container = config.container;
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.resize(width, height);
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
