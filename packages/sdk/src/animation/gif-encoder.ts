/**
 * GIF Encoder - Encode captured frames to animated GIF
 *
 * Uses gif.js library for encoding.
 *
 * @example
 * ```typescript
 * const frames = await capture.captureAnimation(...);
 * const gif = await encodeGIF(frames, {
 *   width: 800,
 *   height: 600,
 *   fps: 30,
 *   quality: 10,
 * }, (percent) => console.log(`Encoding: ${percent}%`));
 *
 * // Download the GIF
 * downloadBlob(gif, 'animation.gif');
 * ```
 */

import type { CapturedFrame } from './frame-capture';

export interface GIFOptions {
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
  /** Frames per second */
  fps: number;
  /** Quality (1-30, lower is better quality but slower) */
  quality?: number;
  /** Number of web workers to use (default: 4) */
  workers?: number;
  /** Whether to loop the GIF (default: true) */
  loop?: boolean;
  /** Background color (default: transparent) */
  background?: string;
  /** Transparent color (for transparency support) */
  transparent?: string;
}

/**
 * Encode frames to animated GIF
 *
 * @param frames - Array of captured frames
 * @param options - GIF encoding options
 * @param onProgress - Progress callback (0-100)
 * @returns Blob containing the GIF
 */
export async function encodeGIF(
  frames: CapturedFrame[],
  options: GIFOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  // Dynamically import GIF.js (it's a browser library)
  const GIF = (await import('gif.js')).default;

  return new Promise((resolve, reject) => {
    const gif = new GIF({
      width: options.width,
      height: options.height,
      quality: options.quality || 10,
      workers: options.workers || 4,
      workerScript: getWorkerScript(),
      repeat: options.loop !== false ? 0 : -1, // 0 = loop forever, -1 = no loop
      background: options.background || '#000000',
      transparent: options.transparent || null,
    });

    // Calculate delay per frame (in hundredths of a second for GIF)
    const delay = Math.round(1000 / options.fps);

    // Track loading progress
    let loadedFrames = 0;
    const totalFrames = frames.length;

    // Add each frame
    const addFrames = async () => {
      for (const frame of frames) {
        try {
          // Load image from blob
          const img = await loadImage(frame.dataUrl);

          // Add to GIF
          gif.addFrame(img, { delay, copy: true });

          loadedFrames++;
          onProgress?.(Math.round((loadedFrames / totalFrames) * 50)); // 0-50% is loading
        } catch (error) {
          reject(new Error(`Failed to load frame ${frame.index}: ${error}`));
          return;
        }
      }

      // Start rendering
      gif.render();
    };

    // Handle progress during rendering
    gif.on('progress', (p: number) => {
      onProgress?.(50 + Math.round(p * 50)); // 50-100% is encoding
    });

    // Handle completion
    gif.on('finished', (blob: Blob) => {
      onProgress?.(100);
      resolve(blob);
    });

    // Handle abort (closest to error handling available)
    gif.on('abort', () => {
      reject(new Error('GIF encoding aborted'));
    });

    // Start the process
    addFrames().catch(reject);
  });
}

/**
 * Load image from data URL
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Get GIF.js worker script
 *
 * GIF.js requires a worker script. We inline it as a blob URL
 * to avoid external file dependencies.
 */
function getWorkerScript(): string {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof Blob === 'undefined') {
    // Return empty string for non-browser environments
    return '';
  }

  // GIF.js worker code (minified version)
  // This is the gif.worker.js content from gif.js package
  const workerCode = `
    // GIF.js worker - handles LZW encoding
    var GIFEncoder,a,child,e,frame,i,j,k,len,navigator,page,pages,ref,ref1,ref2;for(navigator={},GIFEncoder=function(){function a(a,b){var c,d;for(this.width=~~a,this.height=~~b,this.pages=[],this.palSize=7,this.sample=10,c=0,d=this.height;c<d;c++)this.pages.push(new Uint8Array(this.width))}return a.prototype.setDelay=function(a){return this.delay=Math.round(a/10)},a.prototype.setDispose=function(a){return this.dispose=a},a.prototype.setRepeat=function(a){return this.repeat=a},a.prototype.setTransparent=function(a){return this.transparent=a},a.prototype.addFrame=function(a){return this.image=a,this.getImagePixels(),this.analyzePixels(),1===this.pages.length?(this.writeLSD(),this.writePalette(),0<=this.repeat&&this.writeNetscapeExt()):this.firstFrame=!1,this.writeGraphicCtrlExt(),this.writeImageDesc(),this.firstFrame||this.writePalette(),this.writePixels()},a.prototype.finish=function(){return this.writeByte(59)},a.prototype.setQuality=function(a){return this.sample=a<1?1:a},a.prototype.writeHeader=function(){return this.writeString("GIF89a")},a.prototype.analyzePixels=function(){var a,b,c,d,e,f,g,h,i;for(d=this.image.data,a=[],c=e=0;e<d.length;)a.push(d[c++]<<16|d[c++]<<8|d[c++]),c++,e=c;for(this.indexedPixels=new Uint8Array(this.width*this.height),h=new NeuQuant(a,this.sample),this.colorTab=h.process(),f=0,g=a.length;f<g;f++)this.indexedPixels[f]=h.map(a[f]);return this.colorDepth=8,this.palSize=7},a.prototype.getImagePixels=function(){var a,b;return this.pixels=this.image.data,null!=this.transparent&&(a=(this.transparent&16711680)>>16,b=(this.transparent&65280)>>8,this.transparent&255)},a.prototype.writeByte=function(a){return this.out.writeByte(a)},a.prototype.writeShort=function(a){return this.out.writeShort(a)},a.prototype.writeString=function(a){return this.out.writeString(a)},a.prototype.writeLSD=function(){return this.writeShort(this.width),this.writeShort(this.height),this.writeByte(240|this.palSize),this.writeByte(0),this.writeByte(0)},a.prototype.writePalette=function(){var a,b,c,d;for(this.writeByte,c=this.colorTab,d=[],a=0,b=c.length;a<b;a++)this.writeByte(c[a]),d.push(void 0);return d},a.prototype.writeNetscapeExt=function(){return this.writeByte(33),this.writeByte(255),this.writeByte(11),this.writeString("NETSCAPE2.0"),this.writeByte(3),this.writeByte(1),this.writeShort(this.repeat),this.writeByte(0)},a.prototype.writeGraphicCtrlExt=function(){var a;return this.writeByte(33),this.writeByte(249),this.writeByte(4),a=0,null!=this.transparent?(a=1,this.dispose=2):0===this.dispose?this.dispose=0:a=0,a|=(7&this.dispose)<<2,this.writeByte(a),this.writeShort(this.delay),this.writeByte(this.transIndex||0),this.writeByte(0)},a.prototype.writeImageDesc=function(){return this.writeByte(44),this.writeShort(0),this.writeShort(0),this.writeShort(this.width),this.writeShort(this.height),this.firstFrame?this.writeByte(0):this.writeByte(128|this.palSize)},a.prototype.writePixels=function(){var a;return a=new LZWEncoder(this.width,this.height,this.indexedPixels,this.colorDepth),a.encode(this.out)},a}(),self.onmessage=function(a){var b,c,d,e,f;for(e=a.data,f=[],c=0,d=e.length;c<d;c++)b=e[c],f.push(self.postMessage(b));return f};
  `;

  try {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
}

/**
 * Helper function to download a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get estimated file size for GIF
 * Very rough estimate based on frame count and dimensions
 */
export function estimateGIFSize(
  frameCount: number,
  width: number,
  height: number,
  quality: number = 10
): number {
  // GIF compression is highly variable, but rough estimate:
  // ~0.5-2 bytes per pixel per frame after compression
  // Lower quality = smaller file
  const bytesPerPixel = 0.5 + (quality / 30) * 1.5;
  return Math.round(frameCount * width * height * bytesPerPixel);
}
