// GUI Library Exports
// Utilities, API client, and helper functions

// API Client
export {
  evaluateCode,
  parseCode,
  exportGeometry,
  downloadFile,
  checkHealth,
  type GeometryResponse,
  type EvaluateResult,
  type ParseResult,
} from '../../lib/api-client';

// Animation utilities
export {
  detectAnimation,
  calculateTotalFrames,
  calculateTValue,
  calculateFrame,
  FrameCache,
  estimateFileSize,
  formatBytes,
  validateExportSettings,
  createInitialAnimationState,
  updateFrame,
  initializeFrameCapture,
  captureFrame,
  encodeWebM,
  encodeGif,
  exportAnimationFrames,
  type ExportSettings,
  type AnimationState,
  type FrameCapture,
} from '../../lib/animation-utils';

// Export animation (GIF/WebM)
export {
  exportAnimation,
  getSupportedFormats,
  isFormatSupported,
  getFormatWarning,
  type FrameRenderer,
  type ExportProgressCallback,
} from '../../lib/export-animation';

// Printer presets
export {
  PRINTER_PRESETS,
  getDefaultPrinter,
  findPrinter,
  getPrintersByManufacturer,
  getManufacturers,
  type PrinterPreset,
} from '../../lib/printer-presets';

// Storage utilities
export {
  saveFile,
  loadFile,
  loadAllFiles,
  deleteFile,
  getCurrentFileId,
  getCurrentFile,
  createNewFile,
  exportFileAsScad,
  importFileFromScad,
  saveLayoutPrefs,
  loadLayoutPrefs,
  type SavedFile,
  type LayoutPrefs,
} from '../../lib/storage';

// Three.js utilities
export { SceneManager, type SceneConfig } from '../../lib/three-utils';

// WebSocket utilities
export {
  WebSocketClient,
  wsClient,
  type WebSocketMessage,
  type WebSocketMessageType,
} from '../../lib/websocket';

// OpenSCAD language - side effect import (registers Monaco language)
// Import this to register OpenSCAD syntax highlighting in Monaco
// Note: This has side effects and registers the language globally
