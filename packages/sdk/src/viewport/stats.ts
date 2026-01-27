/**
 * Stats overlay for viewport performance
 */

export class StatsOverlay {
  private container: HTMLElement;
  private stats: any = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createStats();
  }

  private createStats(): void {
    // Simple stats display
    this.stats = {
      fps: 60,
      geometries: 0,
      vertices: 0,
      triangles: 0
    };
    this.updateDisplay();
  }

  /**
   * Update stats display
   */
  updateStats(data: Partial<typeof this.stats>): void {
    Object.assign(this.stats, data);
    this.updateDisplay();
  }

  private updateDisplay(): void {
    // Remove existing stats
    const existing = this.container.querySelector('.viewport-stats');
    if (existing) {
      existing.remove();
    }

    // Create stats element
    const statsDiv = document.createElement('div');
    statsDiv.className = 'viewport-stats';
    statsDiv.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
    `;

    statsDiv.innerHTML = `
      FPS: ${this.stats?.fps || 0}<br>
      Geometries: ${this.stats?.geometries || 0}<br>
      Vertices: ${this.stats?.vertices || 0}<br>
      Triangles: ${this.stats?.triangles || 0}
    `;

    this.container.appendChild(statsDiv);
  }

  /**
   * Dispose stats
   */
  dispose(): void {
    const existing = this.container.querySelector('.viewport-stats');
    if (existing) {
      existing.remove();
    }
  }
}