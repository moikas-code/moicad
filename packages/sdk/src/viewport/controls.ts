/**
 * Basic camera controls for viewport
 * 
 * Simplified version - just provides orbit-like functionality
 */

export class ViewportControls {
  private camera: any;
  private container: HTMLElement;
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private rotation = { x: 0, y: 0 };
  private distance = 100;

  constructor(camera: any, container: HTMLElement) {
    this.camera = camera;
    this.container = container;
    this.setupControls();
  }

  private setupControls(): void {
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('wheel', this.onWheel.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;

    // Rotate around Y axis (horizontal movement)
    this.rotation.y += deltaX * 0.01;

    // Rotate around X axis (vertical movement)
    this.rotation.x += deltaY * 0.01;

    // Update camera rotation
    this.updateCameraPosition();
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.distance += event.deltaY * 0.1;
    this.distance = Math.max(10, Math.min(500, this.distance));
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    // Convert spherical coordinates to Cartesian
    const phi = this.rotation.x;
    const theta = this.rotation.y;
    
    const x = this.distance * Math.sin(theta) * Math.cos(phi);
    const y = this.distance * Math.sin(phi);
    const z = this.distance * Math.cos(theta) * Math.cos(phi);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Reset camera to default position
   */
  reset(): void {
    this.rotation = { x: 0, y: 0 };
    this.distance = 100;
    this.updateCameraPosition();
  }

  /**
   * Dispose controls
   */
  dispose(): void {
    // Remove event listeners
    this.container.removeEventListener('mousedown', this.onMouseDown);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('mouseup', this.onMouseUp);
    this.container.removeEventListener('wheel', this.onWheel);
  }
}