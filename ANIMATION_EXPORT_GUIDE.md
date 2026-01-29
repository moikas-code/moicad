# Animation Export Guide

Complete documentation for the moicad animation export system implemented in packages/app and packages/landing.

## Overview

The animation export system allows users to:
1. **Automatically detect** animation functions in their code (JavaScript)
2. **Render and preview** animations frame-by-frame
3. **Export** to GIF or WebM format with customizable settings
4. **Control playback** with play/pause/seek/speed controls

---

## Architecture

### Core Components

#### 1. **Animation Utilities** (`packages/app/lib/animation-utils.ts`)
Core utilities for animation handling (630+ lines):

**Detection**
- `detectAnimation(code, language)` - Detects if code exports animation function with `t` parameter

**Frame Calculation**
- `calculateTotalFrames(fps, duration)` - Calculates total frames needed
- `calculateTValue(frame, totalFrames)` - Converts frame index to t parameter (0-1)
- `calculateFrame(t, totalFrames)` - Converts t value to frame index

**Frame Caching (LRU)**
- `FrameCache` class - Efficient memory management for rendered frames
- Stores up to 100 frames by default (configurable)
- Evicts least-recently-used frames when capacity exceeded
- Prevents redundant re-rendering of same frames

**Export Validation & Utilities**
- `validateExportSettings(settings)` - Validates user settings
- `estimateFileSize(settings, duration)` - Estimates output file size
- `formatBytes(bytes)` - Converts bytes to human-readable format

**Frame Capture**
- `initializeFrameCapture(width, height)` - Creates capture canvas
- `captureFrame(sourceCanvas, targetCapture)` - Captures frame ImageData

**Export Encoding** (NEW)
- `encodeWebM(frameData, fps, loop)` - Encodes using MediaRecorder API
- `encodeGif(frameData, fps, loop)` - Encodes using gif.js library
- `exportAnimationFrames(format, frameData, fps, loop, filename)` - Exports captured frames

#### 2. **Animation Export** (`packages/app/lib/export-animation.ts`)
High-level export orchestration (NEW):

```typescript
export async function exportAnimation(
  renderer: FrameRenderer,
  settings: ExportSettings,
  totalFrames: number,
  onProgress?: ExportProgressCallback
): Promise<void>
```

**Features**
- Renders all frames with t parameter
- Handles viewport resolution differences  
- Scales frames to target resolution
- Fills background with white
- Encodes to selected format
- Tracks progress (0-100%)

#### 3. **Animation Hook** (`packages/app/hooks/useAnimation.ts`)
React hook for animation state management (295+ lines):

```typescript
const animation = useAnimation(isAnimation, {
  initialFps: 30,
  initialDuration: 2000,
  initialLoop: false,
  onFrameChange: (t: number) => { /* ... */ }
});
```

**State Properties**
- `isPlaying` - Whether animation is currently playing
- `currentFrame` - Current frame index
- `totalFrames` - Total number of frames
- `fps` - Frames per second
- `duration` - Duration in milliseconds
- `loop` - Whether animation loops
- `t` - Current t parameter (0-1)

**Methods**
- `play()` - Start playing animation
- `pause()` - Pause animation
- `stop()` - Stop and reset to beginning
- `resume()` - Resume from current position
- `setFrame(index)` - Jump to specific frame
- `setFps(fps)` - Change playback speed
- `setDuration(ms)` - Change animation duration
- `setLoop(enabled)` - Toggle looping

#### 4. **UI Components**

**AnimationControls.tsx** (packages/landing/components/demo/)
- Playback buttons: Play, Pause, Stop, Resume
- Timeline scrubber with frame slider
- FPS selector (15/24/30/60 fps)
- Duration input (0.5 - 60 seconds)
- Loop toggle
- Frame counter display
- Helpful tips overlay
- Theme-matched dark mode styling

**ExportAnimationDialog.tsx** (packages/landing/components/demo/)
- Format selection: GIF or WebM
- Resolution: 320×240 to 4096×4096
- Quality slider: 10-100%
- Loop checkbox
- Estimated file size display
- Export progress bar
- Input validation with error messages
- Cancel/Export buttons

---

## Usage Guide

### For End Users

#### 1. **Writing Animations**

**JavaScript (recommended)**
```javascript
// Function must be default export and accept 't' parameter
export default (t) => {
  // t ranges from 0 to 1 throughout animation duration
  const rotation = t * 360; // Full rotation
  return Shape.cube(10).rotate([0, rotation, 0]);
};
```

**OpenSCAD**
```scad
// Use $t variable (ranges 0-1)
rotate([0, $t * 360, 0])
  cube(10);
```

#### 2. **Previewing**
1. Write animation code
2. The editor automatically detects the animation
3. AnimationControls appear below the viewport
4. Click "Play" to preview
5. Use scrubber or frame slider to seek
6. Adjust FPS/duration as needed

#### 3. **Exporting** (When Implemented)
1. Click "Export" button in AnimationControls
2. ExportAnimationDialog opens
3. Choose format: GIF or WebM
4. Set resolution (default 1280×720)
5. Adjust quality (higher = larger file)
6. Check estimated file size
7. Click "Export" to download

### For Developers

#### Animation Detection

The system detects JavaScript animation patterns:
```javascript
// All these are detected:
export default function(t) { ... }
export default (t) => { ... }
export default async (t) => { ... }
export default function animate(t) { ... }
```

OpenSCAD animations use `$t`:
```scad
translate([sin($t * 2 * 3.14159) * 10, 0, 0])
  cube(5);
```

#### Custom Frame Rendering

Create a frame renderer function:
```typescript
import { FrameRenderer } from '@/lib/export-animation';

const frameRenderer: FrameRenderer = async (t: number) => {
  // Call your rendering function with t
  await myRenderFunction(t);
  
  // Wait for render to complete
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Get canvas element (Three.js WebGL canvas)
  const canvas = document.querySelector('canvas');
  return canvas;
};
```

#### Integration Example

```typescript
import { exportAnimation } from '@/lib/export-animation';
import { calculateTotalFrames } from '@/lib/animation-utils';
import type { ExportSettings } from '@/lib/animation-utils';

// Calculate frames
const totalFrames = calculateTotalFrames(30, 2000); // 30 fps, 2 seconds

// Define settings
const settings: ExportSettings = {
  format: 'webm',
  width: 1280,
  height: 720,
  fps: 30,
  quality: 80,
  loop: true
};

// Export
await exportAnimation(
  frameRenderer,
  settings,
  totalFrames,
  (progress) => console.log(`Progress: ${progress}%`)
);
```

---

## Export Formats

### WebM
- **Codec**: VP9 (primary), VP8 (fallback), H.264 (fallback)
- **Bitrate**: 2.5 Mbps (configurable)
- **Browser API**: MediaRecorder
- **Pros**: 
  - Native browser support
  - Good quality-to-size ratio
  - Plays in all modern browsers
- **Cons**:
  - Larger files for high-resolution animations
  - Some older devices may not support VP9

### GIF
- **Method**: gif.js library (client-side encoding)
- **Quality**: Adjustable (1-30, lower = better quality)
- **Browser API**: Canvas 2D Context + Web Workers
- **CDN**: https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js
- **Pros**:
  - Universal support (all platforms)
  - Small file size for short clips
  - Great for sharing on social media
- **Cons**:
  - Limited color palette (256 colors)
  - Larger files for high-resolution animations
  - Slower encoding than WebM

### File Size Estimates

Estimated sizes for 2-second animations at 30 fps (60 frames):

| Format | Resolution | Quality | Size |
|--------|-----------|---------|------|
| WebM | 1280×720 | Default | ~5-8 MB |
| WebM | 1920×1080 | Default | ~10-15 MB |
| GIF | 1280×720 | Medium | ~3-6 MB |
| GIF | 320×240 | Medium | ~1-2 MB |

*Actual sizes vary based on animation complexity and motion*

---

## Technical Details

### Frame Capture Flow

```
User clicks "Export"
    ↓
ExportAnimationDialog opens
    ↓
User configures settings & clicks "Export"
    ↓
exportAnimation() called with:
  - frameRenderer: async (t) => HTMLCanvasElement
  - settings: { format, resolution, fps, quality, loop }
  - totalFrames: number
  - onProgress: (0-100%) => void
    ↓
For each frame (0 to totalFrames-1):
  1. Calculate t = i / (totalFrames - 1)
  2. Call frameRenderer(t)
  3. Get rendered canvas
  4. Resize to target resolution with aspect-ratio fit
  5. Center on white background
  6. Capture ImageData
  7. Cache for potential re-export
  8. Report progress
    ↓
All frames captured → frameData: ImageData[]
    ↓
Format-specific encoding:
  
  IF WebM:
    Create temporary canvas
    Create MediaRecorder stream
    For each frame:
      - putImageData onto canvas
      - Stream captures frame
      - MediaRecorder encodes
    Wait for encoding complete
    Get Blob from recorder
  
  IF GIF:
    Load gif.js library
    For each frame:
      - Create canvas
      - putImageData
      - Add to gif encoder
    Call gif.render()
    Wait for encoding complete
    Get Blob from gif
    ↓
Create blob URL
Create download link
Trigger click
Revoke URL
```

### Frame Cache Implementation

The LRU cache prevents redundant renders:

```typescript
class FrameCache {
  private cache = new Map<string, { geometry: any; timestamp: number }>();
  private accessOrder: string[] = [];
  private maxSize = 100;

  private getKey(code: string, t: number): string {
    // Hash code + round t to 3 decimals
    return `${hashCode(code)}_${Math.round(t * 1000) / 1000}`;
  }

  get(code: string, t: number): Geometry | undefined {
    const key = this.getKey(code, t);
    const entry = this.cache.get(key);
    if (entry) {
      // Mark as recently used
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
      return entry.geometry;
    }
    return undefined;
  }

  set(code: string, t: number, geometry: Geometry): void {
    // Add to cache
    // If over capacity, evict oldest entry
  }
}
```

### MediaRecorder API

WebM encoding uses browser's MediaRecorder:

```typescript
const stream = canvas.captureStream(fps);
const recorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 2500000
});

recorder.start();
// Feed frames to canvas over time
recorder.stop();
// Get encoded Blob
```

Benefits:
- Hardware acceleration on supported browsers
- Fast encoding
- Native codec support
- No external dependencies

### gif.js Library

GIF encoding uses external library:

```html
<script src="https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js"></script>
```

The library:
- Runs in Web Workers (non-blocking)
- Supports configurable quality
- Outputs proper GIF header/trailer
- Handles frame timing

---

## Performance Considerations

### Memory Usage

- **Frame cache**: ~10-50 MB (100 frames of 1280×720 @ 32-bit)
- **Export buffers**: ~5-20 MB (working memory during encoding)
- **Total**: Typically under 100 MB for standard animations

### Encoding Speed

| Format | Resolution | Speed |
|--------|-----------|-------|
| WebM | 1280×720 | ~5-10 seconds (60 frames) |
| WebM | 1920×1080 | ~15-30 seconds (60 frames) |
| GIF | 1280×720 | ~30-60 seconds (60 frames) |
| GIF | 320×240 | ~5-10 seconds (60 frames) |

*Speed depends on browser hardware acceleration and CPU*

### Optimization Tips

1. **Use lower resolution** for faster preview/export
2. **Reduce frame count** for shorter animations
3. **Use WebM** for faster encoding
4. **Use GIF** only for short clips or low resolution
5. **Cache frames** to avoid re-renders during export

---

## Troubleshooting

### GIF Export Not Working

**Problem**: "gif.js library not loaded" error

**Solution**:
- Wait for CDN script to load (check network tab)
- Check browser console for network errors
- Reload page to retry
- Try WebM format as fallback

### WebM Not Supported

**Problem**: MediaRecorder codec error

**Solution**:
- Try GIF format instead
- Update browser (WebM support is near-universal)
- Check for browser extensions blocking codecs

### Memory Issues

**Problem**: "Out of memory" or browser crash with long animations

**Solution**:
- Export at lower resolution (320×240 or 640×480)
- Reduce animation duration
- Use lower FPS (15 or 24 instead of 60)
- Split into multiple shorter animations

### Incorrect Frame Capture

**Problem**: Viewport not captured or wrong geometry shown

**Solution**:
- Wait for geometry to render fully (check loading state)
- Ensure animation code is valid
- Try re-rendering manually (click in viewport)
- Check browser console for errors

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| MediaRecorder (WebM) | ✅ 49+ | ✅ 25+ | ❌ 11 | ✅ 79+ |
| Canvas.captureStream | ✅ 51+ | ✅ 43+ | ❌ 11 | ✅ 79+ |
| gif.js | ✅ All | ✅ All | ✅ All | ✅ All |
| ImageData API | ✅ All | ✅ All | ✅ All | ✅ All |

**Recommendation**: Use Chrome, Firefox, or Edge for full functionality

---

## API Reference

### ExportSettings Interface

```typescript
interface ExportSettings {
  format: 'webm' | 'gif';
  width: number; // 320-4096
  height: number; // 240-4096
  fps: number; // 15, 24, 30, or 60
  quality: number; // 10-100
  loop: boolean; // Repeat animation
}
```

### FrameRenderer Type

```typescript
type FrameRenderer = (t: number) => Promise<HTMLCanvasElement | null>;
```

### ExportProgressCallback

```typescript
type ExportProgressCallback = (progress: number) => void;
// progress: 0-100
```

### Export Functions

```typescript
// Main export function
export async function exportAnimation(
  renderer: FrameRenderer,
  settings: ExportSettings,
  totalFrames: number,
  onProgress?: ExportProgressCallback
): Promise<void>

// Format-specific encoders
export async function encodeWebM(
  frameData: ImageData[],
  fps?: number,
  loop?: boolean
): Promise<Blob>

export async function encodeGif(
  frameData: ImageData[],
  fps?: number,
  loop?: boolean
): Promise<Blob>

// Export support utilities
export function getSupportedFormats(): ('webm' | 'gif')[]
export function isFormatSupported(format: 'webm' | 'gif'): boolean
export function getFormatWarning(format: 'webm' | 'gif'): string | null
```

---

## File Locations

- **Core Logic**: `packages/app/lib/animation-utils.ts` (630+ lines)
- **Export Orchestration**: `packages/app/lib/export-animation.ts` (NEW - 180+ lines)
- **React Hook**: `packages/app/hooks/useAnimation.ts` (295+ lines)
- **UI Components**: `packages/landing/components/demo/`
  - `AnimationControls.tsx`
  - `ExportAnimationDialog.tsx`

---

## Future Enhancements

1. **Batch Export** - Export multiple animations at once
2. **Frame Extraction** - Save individual frames as PNG
3. **Video Codecs** - H.265 (HEVC) for smaller files
4. **Advanced Filtering** - Blur, effects during export
5. **Streaming Export** - Progressive download of large files
6. **Cloud Storage** - Save directly to cloud services
7. **Animation Editor** - Timeline-based animation creation
8. **Performance Profiling** - Show frame times and optimization tips

---

## Implementation Status

### ✅ Completed
- Animation detection system
- Frame caching (LRU)
- Animation hook (`useAnimation`)
- Playback controls
- Frame calculation utilities
- Export settings validation
- File size estimation
- WebM encoding (MediaRecorder)
- GIF encoding (gif.js)
- AnimationControls UI component
- ExportAnimationDialog UI component

### 🔄 In Progress
- Export animation integration in page handlers
- Testing frame capture from viewport
- Browser compatibility testing

### 📋 TODO
- E2E testing with real animations
- Performance profiling
- Error analytics tracking
- i18n support
- Advanced caching strategies

---

## Contributing

To extend animation export functionality:

1. **Add new format**: Implement encoder in `animation-utils.ts`
2. **Add UI option**: Update `ExportAnimationDialog.tsx`
3. **Add validation**: Add to `validateExportSettings()`
4. **Add tests**: Create test in `tests/animation-utils.test.ts`
5. **Update docs**: Add format to this guide

---

## Support

For issues or questions:
1. Check browser console for error messages
2. Review troubleshooting section above
3. Check animation code syntax
4. Try WebM format if GIF fails
5. Report bug with:
   - Browser version
   - Animation code
   - Export settings
   - Error message
   - Steps to reproduce

---

*Last Updated: January 29, 2026*  
*Animation Export System v1.1 (In Development)*
