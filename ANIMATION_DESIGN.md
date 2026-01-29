# Animation System Design for moicad

## Overview

This document outlines approaches for implementing animation capabilities in moicad, allowing users to simulate actions and movements of CAD objects programmed in the tool.

**Important**: moicad is a **JavaScript-first CAD library**. The fluent `Shape` API is the primary interface. OpenSCAD support exists for compatibility with legacy workflows, but all animation features should prioritize the modern JavaScript API.

## Current State

### Existing Infrastructure

1. **JavaScript Fluent API** (packages/sdk/src/shape.ts)
   - Primary API: `Shape.cube(10).translate([5, 0, 0])`
   - Functional alternative: `translate(cube(10), [5, 0, 0])`
   - All operations immutable, return new Shape instances
   - Ready for animation parameter injection

2. **OpenSCAD `$t` Variable** (packages/sdk/src/scad/evaluator.ts:197)
   - Legacy compatibility: `["$t", 0]` (animation time 0.0-1.0)
   - Currently static, but infrastructure exists to set it dynamically
   - OpenSCAD standard: `$t` ranges from 0.0 to 1.0 over animation duration

3. **Three.js Rendering Loop** (packages/landing/lib/three-utils.ts)
   - `requestAnimationFrame` loop already running: `animate()` method
   - Scene manager with camera, renderer, controls in place
   - Current loop only handles controls updates and rendering

4. **Viewport Architecture**
   - Separate mesh objects per geometry object (for highlighting)
   - Transform capabilities (position, rotation already used for coordinate conversion)
   - Real-time rendering infrastructure ready

## Animation Approaches

### Approach 1: Function-Based Re-evaluation (JavaScript-first)

**How it works:**
- User exports a function that takes `t` parameter (0.0 to 1.0)
- Re-evaluate function for each frame with different `t` values
- User writes code like: `export default (t) => Shape.cube(10).rotate([0, t * 360, 0]);`

**Pros:**
- **Native JavaScript** - clean, modern syntax
- Supports complex procedural animations (parametric changes)
- Users can animate any parameter: size, position, rotation, boolean ops
- No AST parsing overhead (direct function execution)
- Full TypeScript support with autocomplete

**Cons:**
- Computationally expensive (full CSG evaluation per frame)
- Limited to ~10-30 FPS for complex geometries
- Re-executes entire function each frame

**JavaScript Examples:**

```javascript
// Rotating cube
export default (t) => 
  Shape.cube(10).rotate([0, t * 360, 0]);

// Pulsating sphere
export default (t) => 
  Shape.sphere(5 + Math.sin(t * Math.PI * 2) * 2);

// Exploded view
export default (t) => {
  const base = Shape.cube(20);
  const lid = Shape.cube([20, 20, 2]).translate([0, 0, t * 30]);
  return base.union(lid);
};

// Complex gear mechanism
export default (t) => {
  const gear1 = createGear(20).rotate([0, 0, t * 360]);
  const gear2 = createGear(15).rotate([0, 0, -t * 360 * 1.33]).translate([30, 0, 0]);
  return gear1.union(gear2);
};
```

**OpenSCAD Legacy Support:**
- Increment `$t` from 0.0 to 1.0 over N frames
- Re-evaluate entire OpenSCAD code for each frame
- User writes code like: `rotate([0, $t * 360, 0]) cube(10);`
- Same pros/cons as JavaScript approach

**Implementation:**

```typescript
// packages/sdk/src/animation/frame-animator.ts
export class FrameAnimator {
  private code: string;
  private language: 'openscad' | 'javascript';
  private fps: number = 30;
  private duration: number = 2000; // milliseconds
  private currentFrame: number = 0;
  private totalFrames: number;
  private animationId: number | null = null;
  private onFrameCallback: (geometry: Geometry, t: number) => void;

  constructor(
    code: string, 
    language: 'openscad' | 'javascript',
    options: { fps?: number; duration?: number; onFrame: (geometry: Geometry, t: number) => void }
  ) {
    this.code = code;
    this.language = language;
    this.fps = options.fps || 30;
    this.duration = options.duration || 2000;
    this.totalFrames = Math.floor((this.duration / 1000) * this.fps);
    this.onFrameCallback = options.onFrame;
  }

  async start(): Promise<void> {
    this.currentFrame = 0;
    await this.animateFrame();
  }

  private async animateFrame(): Promise<void> {
    if (this.currentFrame >= this.totalFrames) {
      this.stop();
      return;
    }

    // Calculate $t (0.0 to 1.0)
    const t = this.currentFrame / this.totalFrames;

    // Re-evaluate with new $t
    const geometry = await this.evaluateWithT(t);
    
    // Call callback with new geometry
    this.onFrameCallback(geometry, t);

    this.currentFrame++;
    
    // Schedule next frame
    this.animationId = requestAnimationFrame(() => this.animateFrame());
  }

  private async evaluateWithT(t: number): Promise<Geometry> {
    if (this.language === 'javascript') {
      // PRIMARY: JavaScript function evaluation
      // User exports: export default (t) => Shape.cube(10).rotate([0, t * 360, 0])
      const { evaluateJavaScript } = await import('../runtime');
      return await evaluateJavaScript(this.code, { t });
    } else if (this.language === 'openscad') {
      // LEGACY: OpenSCAD $t variable support
      const { parseOpenSCAD } = await import('../scad/parser');
      const { evaluateAST } = await import('../scad/evaluator');
      
      const parseResult = parseOpenSCAD(this.code);
      const evalResult = await evaluateAST(parseResult.ast, {
        variables: new Map([['$t', t]]) // Override $t
      });
      
      return evalResult.geometry;
    }
    
    throw new Error(`Unsupported language: ${this.language}`);
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  pause(): void {
    this.stop();
  }

  async resume(): Promise<void> {
    await this.animateFrame();
  }

  reset(): void {
    this.stop();
    this.currentFrame = 0;
  }

  setFrame(frameNumber: number): void {
    this.currentFrame = Math.max(0, Math.min(frameNumber, this.totalFrames - 1));
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  getTotalFrames(): number {
    return this.totalFrames;
  }
}
```

**Usage Example (JavaScript - Primary):**

```typescript
// In landing page demo
import { FrameAnimator } from '@moicad/sdk/animation';

// User's JavaScript code with animation function
const code = `
import { Shape } from '@moicad/sdk';

export default (t) => {
  const angle = t * 360;
  return Shape.cube(10).rotate([0, angle, 0]);
};
`;

const animator = new FrameAnimator(code, 'javascript', {
  fps: 30,
  duration: 2000, // 2 seconds
  onFrame: (geometry, t) => {
    // Update viewport with new geometry
    sceneManager.renderGeometry({ geometry, success: true });
    console.log(`Frame at t=${t.toFixed(2)}`);
  }
});

await animator.start(); // Start animation
```

**Usage Example (OpenSCAD - Legacy):**

```typescript
// OpenSCAD compatibility mode
const code = `
  // User's animated OpenSCAD code
  rotate([0, $t * 360, 0]) 
    cube(10);
`;

const animator = new FrameAnimator(code, 'openscad', {
  fps: 30,
  duration: 2000,
  onFrame: (geometry, t) => {
    sceneManager.renderGeometry({ geometry, success: true });
  }
});

await animator.start();
```

---

### Approach 2: Transform-Based Animation (Efficient, Limited)

**How it works:**
- Evaluate geometry ONCE at `$t = 0`
- Store transform animations separately (rotation, translation, scale)
- Apply Three.js transforms in render loop (no re-evaluation)

**Pros:**
- 60 FPS smooth animations
- Very efficient (no CSG recalculation)
- Good for simple mechanical simulations

**Cons:**
- Cannot animate boolean operations or parametric changes
- Limited to rigid body transforms (position, rotation, scale)
- Not OpenSCAD compatible for complex animations

**Implementation:**

```typescript
// packages/sdk/src/animation/transform-animator.ts
export interface TransformKeyframe {
  time: number; // 0.0 to 1.0
  position?: [number, number, number];
  rotation?: [number, number, number]; // Euler angles in degrees
  scale?: [number, number, number];
}

export interface AnimationTrack {
  objectId: string;
  keyframes: TransformKeyframe[];
}

export class TransformAnimator {
  private tracks: Map<string, AnimationTrack> = new Map();
  private startTime: number = 0;
  private duration: number; // milliseconds
  private isPlaying: boolean = false;
  private animationId: number | null = null;
  private onUpdateCallback: (transforms: Map<string, THREE.Matrix4>) => void;

  constructor(
    tracks: AnimationTrack[],
    duration: number,
    onUpdate: (transforms: Map<string, THREE.Matrix4>) => void
  ) {
    tracks.forEach(track => this.tracks.set(track.objectId, track));
    this.duration = duration;
    this.onUpdateCallback = onUpdate;
  }

  start(): void {
    this.isPlaying = true;
    this.startTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    if (!this.isPlaying) return;

    const elapsed = performance.now() - this.startTime;
    const t = Math.min(elapsed / this.duration, 1.0); // 0.0 to 1.0

    // Calculate transforms for all objects
    const transforms = new Map<string, THREE.Matrix4>();
    
    this.tracks.forEach((track, objectId) => {
      const transform = this.interpolateTransform(track, t);
      transforms.set(objectId, transform);
    });

    // Call update callback
    this.onUpdateCallback(transforms);

    // Continue animation
    if (t < 1.0) {
      this.animationId = requestAnimationFrame(this.animate);
    } else {
      this.stop();
    }
  };

  private interpolateTransform(track: AnimationTrack, t: number): THREE.Matrix4 {
    // Find keyframes to interpolate between
    let prevKeyframe = track.keyframes[0];
    let nextKeyframe = track.keyframes[track.keyframes.length - 1];

    for (let i = 0; i < track.keyframes.length - 1; i++) {
      if (t >= track.keyframes[i].time && t <= track.keyframes[i + 1].time) {
        prevKeyframe = track.keyframes[i];
        nextKeyframe = track.keyframes[i + 1];
        break;
      }
    }

    // Interpolation factor between keyframes
    const keyframeDuration = nextKeyframe.time - prevKeyframe.time;
    const alpha = keyframeDuration > 0 
      ? (t - prevKeyframe.time) / keyframeDuration 
      : 0;

    // Interpolate position
    const position = this.lerpVec3(
      prevKeyframe.position || [0, 0, 0],
      nextKeyframe.position || [0, 0, 0],
      alpha
    );

    // Interpolate rotation (euler angles)
    const rotation = this.lerpVec3(
      prevKeyframe.rotation || [0, 0, 0],
      nextKeyframe.rotation || [0, 0, 0],
      alpha
    );

    // Interpolate scale
    const scale = this.lerpVec3(
      prevKeyframe.scale || [1, 1, 1],
      nextKeyframe.scale || [1, 1, 1],
      alpha
    );

    // Build transform matrix
    const matrix = new THREE.Matrix4();
    matrix.compose(
      new THREE.Vector3(...position),
      new THREE.Euler(...rotation.map(r => r * Math.PI / 180)), // degrees to radians
      new THREE.Vector3(...scale)
    );

    return matrix;
  }

  private lerpVec3(
    a: [number, number, number], 
    b: [number, number, number], 
    alpha: number
  ): [number, number, number] {
    return [
      a[0] + (b[0] - a[0]) * alpha,
      a[1] + (b[1] - a[1]) * alpha,
      a[2] + (b[2] - a[2]) * alpha
    ];
  }

  stop(): void {
    this.isPlaying = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  pause(): void {
    this.isPlaying = false;
  }

  resume(): void {
    if (!this.isPlaying) {
      this.startTime = performance.now() - (this.duration * this.getCurrentT());
      this.isPlaying = true;
      this.animate();
    }
  }

  private getCurrentT(): number {
    const elapsed = performance.now() - this.startTime;
    return Math.min(elapsed / this.duration, 1.0);
  }
}
```

**Usage Example:**

```typescript
// Define animation tracks
const tracks: AnimationTrack[] = [
  {
    objectId: 'gear1',
    keyframes: [
      { time: 0.0, rotation: [0, 0, 0] },
      { time: 1.0, rotation: [0, 360, 0] } // Full rotation
    ]
  },
  {
    objectId: 'slider',
    keyframes: [
      { time: 0.0, position: [0, 0, 0] },
      { time: 0.5, position: [10, 0, 0] },
      { time: 1.0, position: [0, 0, 0] } // Slide out and back
    ]
  }
];

const animator = new TransformAnimator(tracks, 2000, (transforms) => {
  // Apply transforms to Three.js meshes
  transforms.forEach((matrix, objectId) => {
    const mesh = sceneManager.getObjectMesh(objectId);
    if (mesh) {
      mesh.matrix.copy(matrix);
      mesh.matrixAutoUpdate = false;
    }
  });
});

animator.start();
```

---

### Approach 3: Hybrid Animation (Best of Both)

**How it works:**
- Detect which objects use `$t` in their definition (AST analysis)
- Re-evaluate only objects that depend on `$t` (frame-by-frame)
- Apply transform animations to objects that don't use `$t` (efficient)

**Pros:**
- OpenSCAD compatible for complex animations
- Efficient for simple mechanical parts
- Best performance/flexibility trade-off

**Cons:**
- More complex implementation
- Requires AST dependency analysis

**Implementation Strategy:**

```typescript
// packages/sdk/src/animation/hybrid-animator.ts
export class HybridAnimator {
  private code: string;
  private staticObjects: Map<string, Geometry> = new Map();
  private dynamicObjects: Set<string> = new Set();
  private transformTracks: Map<string, AnimationTrack> = new Map();

  constructor(code: string) {
    this.code = code;
    this.analyzeCode(); // Determine which objects depend on $t
  }

  private analyzeCode(): void {
    // Parse AST
    const parseResult = parseOpenSCAD(this.code);
    
    // Walk AST to find $t usage
    this.walkAST(parseResult.ast, (node) => {
      if (this.nodeUsesT(node)) {
        this.dynamicObjects.add(node.id);
      }
    });
  }

  private nodeUsesT(node: any): boolean {
    // Check if node or its children reference $t variable
    if (node.type === 'variable' && node.name === '$t') {
      return true;
    }
    // Recursively check children...
    return false;
  }

  async animateFrame(t: number): Promise<void> {
    // Re-evaluate only dynamic objects
    for (const objectId of this.dynamicObjects) {
      const geometry = await this.evaluateObject(objectId, t);
      this.updateViewport(objectId, geometry);
    }

    // Apply transforms to static objects
    for (const [objectId, track] of this.transformTracks) {
      if (!this.dynamicObjects.has(objectId)) {
        const transform = this.interpolateTransform(track, t);
        this.applyTransform(objectId, transform);
      }
    }
  }
}
```

---

## Recommended Implementation Plan

### Phase 1: Frame-Based Animation (MVP)
**Goal**: Get basic animation working with JavaScript function parameter `t`

**Tasks**:
1. Implement `FrameAnimator` class in `packages/sdk/src/animation/frame-animator.ts`
2. Update JavaScript runtime to support function parameters:
   - Detect if exported default is a function
   - Call function with `{ t }` parameter
   - Return resulting Shape/Geometry
3. Add animation controls to landing UI:
   - Play/Pause/Stop buttons
   - Frame slider
   - FPS selector (15/30/60)
   - Duration input (milliseconds)
   - Loop toggle
4. Update OpenSCAD evaluator to accept custom `$t` value (legacy support)
5. Test with example animations:
   - Rotating cube: `(t) => Shape.cube(10).rotate([0, t * 360, 0])`
   - Pulsating sphere: `(t) => Shape.sphere(5 + Math.sin(t * Math.PI * 2) * 2)`
   - Opening lid mechanism

**Deliverable**: 
- **Primary**: Users can write `export default (t) => Shape.cube(10).rotate([0, t * 360, 0]);` and see smooth animation
- **Legacy**: OpenSCAD users can write `rotate([0, $t * 360, 0]) cube(10);` and see animation

### Phase 2: Export Animation
**Goal**: Export animations as GIF or video

**Tasks**:
1. Implement frame capture (canvas.toDataURL())
2. Add GIF encoder (use library like `gif.js`)
3. Add MP4 encoder (use `MediaRecorder` API)
4. UI: Export button with format selector

**Deliverable**: Users can export 2-second animated GIF of their model

### Phase 3: Transform-Based Animation
**Goal**: Smooth 60 FPS animations for mechanical simulations

**Tasks**:
1. Implement `TransformAnimator` class
2. Add animation timeline UI (keyframe editor)
3. Integrate with Three.js scene manager
4. Add animation preview mode

**Deliverable**: Users can define keyframe animations without code

### Phase 4: Hybrid Optimization (Optional)
**Goal**: Automatic optimization for complex scenes

**Tasks**:
1. Implement AST dependency analysis
2. Cache static geometry
3. Selective re-evaluation
4. Performance profiling

**Deliverable**: 10x faster animations for complex models

---

## API Design

### SDK API

```typescript
// Animation namespace
import { Animation } from '@moicad/sdk';

// Frame-based animation (JavaScript function with t parameter)
const code = `
export default (t) => Shape.cube(10).rotate([0, t * 360, 0]);
`;

const frameAnim = new Animation.FrameAnimator(code, 'javascript', {
  fps: 30,
  duration: 2000,
  loop: true,
  onFrame: (geometry, t) => { /* update viewport */ }
});

await frameAnim.start();
frameAnim.pause();
frameAnim.resume();
frameAnim.stop();

// Also supports OpenSCAD for legacy compatibility
const legacyCode = `rotate([0, $t * 360, 0]) cube(10);`;
const legacyAnim = new Animation.FrameAnimator(legacyCode, 'openscad', { ... });

// Transform-based animation
const transformAnim = new Animation.TransformAnimator([
  {
    objectId: 'gear',
    keyframes: [
      { time: 0, rotation: [0, 0, 0] },
      { time: 1, rotation: [0, 360, 0] }
    ]
  }
], 2000, (transforms) => { /* apply transforms */ });

transformAnim.start();

// Export animation
const frames = await Animation.captureFrames(frameAnim, 60); // 60 frames
const gif = await Animation.exportGIF(frames, { fps: 30, quality: 10 });
const mp4 = await Animation.exportMP4(frames, { fps: 30, bitrate: 2000 });
```

### Landing UI Components

```typescript
// packages/landing/components/demo/AnimationControls.tsx
export default function AnimationControls() {
  return (
    <div className="animation-controls">
      <button onClick={handlePlay}>▶️ Play</button>
      <button onClick={handlePause}>⏸️ Pause</button>
      <button onClick={handleStop}>⏹️ Stop</button>
      
      <input 
        type="range" 
        min={0} 
        max={totalFrames} 
        value={currentFrame}
        onChange={handleFrameChange}
      />
      
      <select value={fps} onChange={handleFpsChange}>
        <option value={15}>15 FPS</option>
        <option value={30}>30 FPS</option>
        <option value={60}>60 FPS</option>
      </select>
      
      <input 
        type="number" 
        value={duration} 
        onChange={handleDurationChange}
        placeholder="Duration (ms)"
      />
      
      <button onClick={handleExportGIF}>Export GIF</button>
      <button onClick={handleExportMP4}>Export MP4</button>
    </div>
  );
}
```

---

## Example Use Cases

### 1. Rotating Gear (JavaScript)
```javascript
import { Shape } from '@moicad/sdk';

// Helper function to create gear
function createGear(teeth = 8, radius = 20, height = 10) {
  const outer = Shape.cylinder(height, radius, { $fn: teeth });
  const inner = Shape.cylinder(height + 2, 5, { center: true });
  return outer.difference(inner);
}

// Animation: rotate gear
export default (t) => {
  return createGear().rotate([0, 0, t * 360]);
};
```

### 2. Piston Mechanism (JavaScript)
```javascript
import { Shape } from '@moicad/sdk';

export default (t) => {
  // Piston moves up and down using sine wave
  const offset = Math.sin(t * Math.PI * 2) * 10;
  
  const piston = Shape.cylinder(20, 5).translate([0, 0, offset]);
  const rod = Shape.cube([2, 2, 20]).translate([0, 0, offset + 10]);
  
  return piston.union(rod);
};
```

### 3. Opening Lid (JavaScript)
```javascript
import { Shape } from '@moicad/sdk';

export default (t) => {
  // Base box
  const base = Shape.cube([30, 30, 10]);
  
  // Lid rotates open (0° to 90°)
  const lid = Shape.cube([30, 30, 2])
    .translate([0, 30, 10])
    .rotate([-t * 90, 0, 0]);
  
  return base.union(lid);
};
```

### 4. Exploded View Assembly (JavaScript)
```javascript
import { Shape } from '@moicad/sdk';

export default (t) => {
  // Parts move outward from center over time
  const explosionDistance = t * 30;
  
  const part1 = Shape.cube(10).translate([explosionDistance, 0, 0]);
  const part2 = Shape.sphere(5).translate([-explosionDistance, 0, 0]);
  const part3 = Shape.cylinder(10, 3).translate([0, 0, explosionDistance]);
  
  return part1.union(part2).union(part3);
};
```

### 5. Pulsating Sphere (JavaScript)
```javascript
import { Shape } from '@moicad/sdk';

export default (t) => {
  // Radius oscillates between 5 and 7
  const radius = 5 + Math.sin(t * Math.PI * 2) * 2;
  return Shape.sphere(radius);
};
```

### 6. Complex Gear Train (JavaScript)
```javascript
import { Shape } from '@moicad/sdk';

function createGear(teeth, radius) {
  const outer = Shape.cylinder(5, radius, { $fn: teeth });
  const inner = Shape.cylinder(6, 3, { center: true });
  return outer.difference(inner);
}

export default (t) => {
  // Two meshing gears with different gear ratios
  const gear1 = createGear(8, 20).rotate([0, 0, t * 360]);
  
  const gear2 = createGear(12, 15)
    .rotate([0, 0, -t * 360 * (8/12)]) // Inverse gear ratio
    .translate([35, 0, 0]);
  
  return gear1.union(gear2);
};
```

---

### OpenSCAD Legacy Examples

For users migrating from OpenSCAD, the `$t` variable still works:

```openscad
// Rotating gear (OpenSCAD)
module gear() {
  difference() {
    cylinder(h=10, r=20, $fn=8);
    cylinder(h=12, r=5, center=true);
  }
}

rotate([0, 0, $t * 360])
  gear();
```

```openscad
// Exploded view (OpenSCAD)
translate([$t * 30, 0, 0]) cube(10);
translate([-$t * 30, 0, 0]) sphere(5);
translate([0, 0, $t * 30]) cylinder(h=10, r=3);
```

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Evaluation**: Only compute frames when needed
2. **Web Workers**: Offload CSG computation to background thread
3. **Geometry Caching**: Cache static parts between frames
4. **LOD (Level of Detail)**: Reduce polygon count for preview
5. **Adaptive FPS**: Automatically reduce FPS if frame time > 33ms

### Benchmarks (Estimated)

| Complexity | Frame-Based FPS | Transform-Based FPS |
|------------|----------------|-------------------|
| Simple (100 polygons) | 60 | 60 |
| Medium (1,000 polygons) | 30 | 60 |
| Complex (10,000 polygons) | 10-15 | 60 |
| Very Complex (100,000+) | 3-5 | 60 |

---

## Conclusion

**Recommended starting point**: Implement **Approach 1 (Function-Based)** as MVP because:
- **JavaScript-first** with clean, modern API
- Infrastructure already exists (Shape API, rendering loop)
- OpenSCAD compatibility maintained via `$t` variable
- Enables powerful parametric animations
- Simple implementation (~200 lines of code)
- Full TypeScript support with autocomplete
- Can optimize later with hybrid approach

**Next steps**:
1. Implement `FrameAnimator` class
2. Add animation UI controls to landing page
3. Add example animations to docs
4. Implement frame export (GIF/MP4)
5. Performance optimization with Web Workers
