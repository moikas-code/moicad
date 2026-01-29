# @moicad/gui

Reusable React components, hooks, and utilities for building CAD editor interfaces with moicad.

## Installation

```bash
npm install @moicad/gui @moicad/sdk
# or
bun add @moicad/gui @moicad/sdk
```

### Peer Dependencies

This package requires the following peer dependencies:

- `react` >= 18.0.0
- `react-dom` >= 18.0.0
- `three` >= 0.150.0

## Usage

### Basic Editor Setup

```tsx
import { Editor, Viewport } from '@moicad/gui';
import { useState } from 'react';

function App() {
  const [code, setCode] = useState('cube(10);');
  const [geometry, setGeometry] = useState(null);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Editor 
        value={code} 
        onChange={setCode}
        language="openscad"
      />
      <Viewport geometry={geometry} />
    </div>
  );
}
```

### Full-Featured Editor (CADEditor Component)

The easiest way to get a complete CAD editor interface:

```tsx
import { CADEditor } from '@moicad/gui/components';

function App() {
  return (
    <CADEditor
      initialLanguage="javascript"
      showFileManager={true}
      showAnimationExport={true}
      showTopMenu={true}
      showPrinterSettings={true}
      apiBaseUrl="http://localhost:42069"  // Optional: API endpoint
    />
  );
}
```

**CADEditor Props:**
- `initialCode?: string` - Starting code (default: `cube(10);`)
- `initialLanguage?: 'openscad' | 'javascript'` - Code language
- `apiBaseUrl?: string` - API endpoint base URL (default: same origin)
- `showFileManager?: boolean` - Show file browser (default: true)
- `showAnimationExport?: boolean` - Show animation export features (default: true)
- `showTopMenu?: boolean` - Show top menu bar (default: true)
- `showPrinterSettings?: boolean` - Show printer presets (default: true)
- `onCodeChange?: (code: string) => void` - Code change callback
- `onGeometryUpdate?: (geometry: any) => void` - Geometry update callback
- `onError?: (error: string) => void` - Error callback

### Custom Editor Layout

For more control, build your own layout with individual components:

```tsx
import {
  Editor,
  Viewport,
  TopMenu,
  Sidebar,
  FileManager,
  AnimationControls,
  ErrorDisplay,
  StatsOverlay
} from '@moicad/gui/components';
import { useEditor, useGeometry, useAnimation } from '@moicad/gui/hooks';
import { evaluateCode } from '@moicad/gui/lib';

function CustomCADEditor() {
  const editor = useEditor({ defaultCode: 'cube(10);' });
  const geometry = useGeometry();
  const animation = useAnimation();

  const handleRender = async () => {
    const result = await evaluateCode(editor.code, editor.language);
    if (result.success) {
      geometry.setGeometry(result.geometry);
    }
  };

  return (
    <div className="cad-editor">
      <TopMenu onRender={handleRender} />
      <div className="main-content">
        <FileManager />
        <Editor {...editor} onRender={handleRender} />
        <Viewport {...geometry} />
        <Sidebar geometry={geometry.current} />
      </div>
      {animation.isAnimation && (
        <AnimationControls {...animation} />
      )}
      {geometry.error && <ErrorDisplay error={geometry.error} />}
      <StatsOverlay stats={geometry.current?.stats} />
    </div>
  );
}
```

## Components

### Editor Components

- **`<Editor>`** - Monaco-based code editor with OpenSCAD/JavaScript syntax highlighting
- **`<FileManager>`** - File browser with save/load functionality
- **`<TopMenu>`** - Application menu bar (File, Edit, View, etc.)
- **`<ErrorDisplay>`** - Error message display with syntax highlighting

### Viewport Components

- **`<Viewport>`** - Three.js 3D viewport with orbit controls
- **`<ViewportWrapper>`** - Viewport with camera controls context
- **`<StatsOverlay>`** - Geometry statistics overlay (vertex count, faces, volume)

### Control Components

- **`<AnimationControls>`** - Timeline controls for animated models
- **`<Sidebar>`** - Export controls and settings panel
- **`<PrinterSettings>`** - 3D printer configuration presets
- **`<RenderProgressBar>`** - Render progress indicator

### Utility Components

- **`<ErrorBoundary>`** - React error boundary wrapper
- **`<ResizablePanel>`** - Draggable panel resizing

## Hooks

### `useEditor(options)`

Manages code editor state with localStorage persistence.

```tsx
const editor = useEditor({
  defaultCode: 'cube(10);',
  language: 'openscad',
  storageKey: 'my-editor'
});
```

### `useGeometry()`

Manages 3D geometry state and evaluation.

```tsx
const { geometry, error, isLoading, evaluate } = useGeometry();
```

### `useAnimation(options)`

Handles animation timeline and playback.

```tsx
const animation = useAnimation({
  onFrame: (t) => console.log(`Frame t=${t}`)
});
```

### `useViewportMenus()`

Manages viewport context menus and interactions.

### `useWebSocket(url, options)`

WebSocket connection for real-time collaboration.

### `useResizablePanel(options)`

Manages resizable panel state.

## Utilities

### API Client

```tsx
import { evaluateCode, parseCode, exportGeometry } from '@moicad/gui/lib';

// Evaluate code to geometry
const result = await evaluateCode('cube(10);', 'openscad');

// Parse code to AST
const ast = await parseCode('sphere(5);');

// Export geometry
await exportGeometry(geometry, 'stl', 'output.stl');
```

### Three.js Utilities

```tsx
import { 
  createGeometryFromData,
  createMeshFromGeometry,
  exportToSTL,
  exportToOBJ
} from '@moicad/gui/lib';

const threeMesh = createMeshFromGeometry(geometry);
const stlData = exportToSTL(geometry);
```

### Animation Utilities

```tsx
import {
  detectAnimation,
  renderAnimationFrame,
  exportAnimationGIF
} from '@moicad/gui/lib';

const isAnim = detectAnimation(code, language);
const frameGeometry = await renderAnimationFrame(code, 0.5);
await exportAnimationGIF(frames, 'output.gif');
```

### Storage Utilities

```tsx
import { 
  saveFile,
  loadFile,
  listFiles,
  deleteFile
} from '@moicad/gui/lib';

saveFile('my-model', { code, language });
const file = loadFile('my-model');
const files = listFiles();
deleteFile('my-model');
```

### Printer Presets

```tsx
import { printerPresets, type PrinterPreset } from '@moicad/gui/lib';

const ender3 = printerPresets.find(p => p.name === 'Ender 3');
console.log(ender3.buildVolume); // [220, 220, 250]
```

## Usage in @moicad/cli

The `@moicad/cli` package uses the CADEditor component to provide a full-featured web UI:

```bash
# Install CLI
npm install -g @moicad/cli

# Launch web UI (loads CADEditor from @moicad/gui via CDN)
moicad
```

The CLI:
1. Serves a minimal HTML page from `packages/cli/src/server.ts`
2. Uses import maps to load `@moicad/gui` from CDN at runtime
3. Renders CADEditor to the DOM
4. Routes API calls to the local Bun server

This approach keeps the CLI binary lightweight (~1.75 MB) while providing the full-featured GUI.

**Architecture Diagram:**
```
Browser
  ├─ HTML (from CLI server)
  ├─ React 19.2.4 (esm.sh)
  ├─ Three.js 0.182.0 (esm.sh)
  ├─ Monaco 0.55.1 (esm.sh)
  ├─ @moicad/gui CADEditor (CDN.js)
  └─ @moicad/sdk (CDN.js)

Local Bun Server (port 42069)
  ├─ /api/evaluate
  ├─ /api/parse
  ├─ /api/export
  └─ /manifold.wasm
```

## Theming

Components use Tailwind CSS classes. To customize:

```tsx
import '@moicad/gui/styles.css'; // If we export styles

// Or provide your own theme
<Editor
  className="custom-editor-theme"
  theme="vs-dark" // Monaco theme
/>
```

## TypeScript

All components, hooks, and utilities are fully typed with TypeScript definitions included.

```tsx
import type {
  EditorRef,
  AnimationControlsProps,
  FileManagerRef,
  GeometryData,
  PrinterPreset
} from '@moicad/gui';
```

## API Configuration

By default, components expect API endpoints at:
- `POST /api/evaluate` - Code evaluation
- `POST /api/parse` - Code parsing
- `POST /api/export` - Geometry export

Configure custom endpoints:

```tsx
import { setAPIBaseURL } from '@moicad/gui/lib';

setAPIBaseURL('http://localhost:42069');
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires WebAssembly support for @moicad/sdk.

## License

MIT

## Links

- [GitHub Repository](https://github.com/moikas/moicad)
- [Documentation](https://moicad.moikas.com/docs)
- [Examples](https://github.com/moikas/moicad/tree/main/examples)
- [@moicad/sdk](https://www.npmjs.com/package/@moicad/sdk) - Core CAD engine
- [@moicad/cli](https://www.npmjs.com/package/@moicad/cli) - Command-line tool
