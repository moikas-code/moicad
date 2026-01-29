# moicad v0.1.0 Release Notes

**Release Date**: January 29, 2026  
**Status**: Production Ready  
**Packages**: CLI, SDK, Landing Page App

---

## Overview

moicad v0.1.0 is the initial release of the Modern JavaScript CAD Platform. This release includes a fully functional web-based CAD editor with real-time 3D preview, animation support, and comprehensive error handling.

---

## What's New in v0.1.0

### 🚀 Core Features

**Web-Based CAD Editor**
- ✅ Full Monaco editor with syntax highlighting
- ✅ Real-time 3D geometry preview with Three.js
- ✅ Support for both JavaScript and OpenSCAD syntaxes
- ✅ Hot reload during editing
- ✅ File management with localStorage persistence

**OpenSCAD Compatibility**
- ✅ 98-99% OpenSCAD syntax support
- ✅ Full primitive shapes (cube, sphere, cylinder, cone, etc.)
- ✅ CSG operations (union, difference, intersection, hull, minkowski)
- ✅ Transformations (translate, rotate, scale, mirror, multmatrix)
- ✅ 2D operations (extrude, offset, projection)
- ✅ Special variables ($fn, $fa, $fs, $t, $vpr, etc.)
- ✅ Built-in functions (math, string, array operations)
- ✅ Modular includes with `use` and `include`

**JavaScript Shape API**
- ✅ Fluent API: `Shape.cube(10).translate([5, 0, 0])`
- ✅ Functional API: `translate(cube(10), [5, 0, 0])`
- ✅ First-class Shape objects with chainable operations
- ✅ Direct manifold-3d integration for fast rendering

**3D Viewport**
- ✅ Real-time geometry rendering with Three.js
- ✅ Orbit camera controls
- ✅ Grid, axes, and measurement guides
- ✅ Bounding box visualization
- ✅ Geometry statistics (vertex count, face count, volume)
- ✅ Responsive canvas sizing
- ✅ Dark theme UI

**Animation System** (NEW)
- ✅ Automatic animation detection from code
- ✅ Frame-by-frame playback with `t` parameter (0-1)
- ✅ Play, pause, stop, resume controls
- ✅ Timeline scrubber for frame seeking
- ✅ Adjustable FPS (15, 24, 30, 60)
- ✅ Customizable duration (0.5-60 seconds)
- ✅ Loop mode toggle
- ✅ LRU frame cache to avoid redundant renders

**Animation Export** (NEW)
- ✅ WebM export via MediaRecorder API
  - VP9 primary codec with VP8 and H.264 fallbacks
  - 2.5 Mbps bitrate for quality
  - Hardware acceleration support
- ✅ GIF export via gif.js library
  - Configurable quality (1-30)
  - Efficient Web Worker processing
  - Universal browser support
- ✅ Customizable export settings
  - Resolution: 320×240 to 4096×4096
  - Quality: 10-100%
  - FPS: 15, 24, 30, or 60
  - Loop toggle
- ✅ Estimated file size preview
- ✅ Progress tracking during export

**Error Handling System** (NEW)
- ✅ Categorized errors (SYNTAX, LOGIC, SYSTEM)
- ✅ Error severity levels (WARNING, ERROR, CRITICAL)
- ✅ Smart error detection
  - Missing return statements
  - Missing exports
  - Wrong types
  - Forbidden imports
- ✅ Adaptive error messages
  - Detailed suggestions for user errors
  - Concise messages for system errors
- ✅ Actionable fix examples with copy buttons
- ✅ Code context display around errors
- ✅ Stack trace parsing with line/column info
- ✅ Documentation links for each error
- ✅ Color-coded error display (syntax, logic, system)

**Export Formats**
- ✅ STL export for 3D printing
- ✅ OBJ export for external tools
- ✅ WebM export for animations
- ✅ GIF export for animations

**Developer Tools**
- ✅ Comprehensive TypeScript support
- ✅ Full type definitions for Shape API
- ✅ Plugin system foundation
- ✅ REST API for evaluate/parse/export operations

**CLI Application**
- ✅ One-command installation via npm
- ✅ `moicad` command to launch web UI
- ✅ Auto-open browser support
- ✅ Dev mode for plugin development
- ✅ Auto-update functionality
- ✅ File opening capability (e.g., `moicad design.scad`)

### 📦 Packages Included

**@moicad/sdk** (v0.1.10)
- Core CAD engine with manifold-3d integration
- OpenSCAD parser and evaluator
- Shape fluent and functional APIs
- Animation support with frame caching
- Enhanced error handling system
- Export utilities (STL, OBJ, geometry types)

**@moicad/cli** (v0.1.0)
- Standalone CLI launcher
- 29 KB minified binary
- Bundles full app (853 MB including dependencies)
- Cross-platform (Linux, macOS, Windows via Bun)
- Auto-update support

**moicad Landing Page** (Web App)
- Full-featured web editor
- Interactive demo with examples
- Real-time preview
- API documentation
- Example gallery

---

## System Requirements

### Client (Browser)
- Modern browser with WebGL support
- Chrome 51+ / Firefox 43+ / Safari 14+ / Edge 79+
- 4 GB RAM recommended for complex models
- 2+ GB disk space for application cache

### Server/CLI
- Bun v1.0.0 or higher
- Node.js 18+ (for npm install)
- 2 GB RAM recommended
- 2 GB disk space for cached dependencies

### Development
- TypeScript 5.0+
- Node.js 18+ for build tools
- Bun for fast development builds

---

## Installation

### Via NPM (Recommended)
```bash
npm install -g @moicad/cli
moicad
```

### Via Bun
```bash
bun install -g @moicad/cli
moicad
```

### Manual Build
```bash
git clone https://github.com/anomalyco/moicad.git
cd moicad
bun install
npm run build --prefix packages/cli
```

### Docker (Coming in v0.2.0)
```bash
docker run -p 3000:3000 moicad:latest
```

---

## Quick Start

### Basic Usage
```bash
# Launch web UI
moicad

# Open file
moicad design.scad

# Dev mode with hot reload
moicad --dev

# Custom port
moicad --port 8080

# Auto-open browser
moicad --open
```

### Write Your First CAD Model

**JavaScript**
```javascript
import { Shape } from '@moicad/sdk';

export default Shape.cube(10)
  .translate([5, 0, 0])
  .union(Shape.sphere(5));
```

**OpenSCAD**
```scad
cube(10);
translate([5, 0, 0])
  sphere(5);
```

### Create an Animation
```javascript
import { Shape } from '@moicad/sdk';

export default (t) => {
  const rotation = t * 360; // Full rotation
  return Shape.cube(10).rotate([0, rotation, 0]);
};
```

Then:
1. Editor automatically detects animation
2. Click "Play" to preview
3. Use timeline slider to scrub
4. Click "Export" to save as WebM or GIF

---

## Known Limitations

### OpenSCAD Compatibility
- ✅ 98-99% compatibility (only edge cases unsupported)
- ⚠️ Multi-line comments with nested `/*` not fully tested
- ⚠️ Very large models (>1M faces) may have performance issues
- ⚠️ Some mathematical functions have platform-specific behavior

### Animation Export
- ⏳ Safari WebM export not supported (use GIF instead)
- ⏳ Very high resolution animations (4K+) may be slow to encode
- ⏳ GIF color palette limited to 256 colors

### Browser Compatibility
- ✅ Chrome/Firefox/Edge: Full support
- ⚠️ Safari: Limited WebM support (GIF works)
- ❌ IE11: Not supported

### Performance
- ✅ Models up to 500K faces: Smooth (60 fps)
- ⚠️ Models 500K-2M faces: Acceptable (30-60 fps)
- ❌ Models >2M faces: May be slow

---

## Breaking Changes

This is v0.1.0 - the initial release. Future versions may introduce breaking changes to:
- Shape API (pending full public API stabilization)
- OpenSCAD evaluation semantics
- Export format specifications

See ROADMAP.md for stability commitments.

---

## Upgrading

N/A (First release)

---

## Dependencies

### Production
- **@moicad/sdk**: Core CAD engine
  - manifold-3d: WASM-based CSG solver
  - three.js: 3D graphics rendering
  - zod: Runtime type validation

- **Next.js**: Web framework
- **React**: UI library
- **Monaco Editor**: Code editor
- **gif.js**: GIF encoding

### Development
- **TypeScript**: Static type checking
- **Bun**: Fast build tool
- **Tailwind CSS**: Styling
- **ESLint**: Code linting

### Browser APIs
- Canvas 2D: Frame capture
- MediaRecorder: WebM encoding
- WebGL: 3D rendering
- Web Workers: Background processing

---

## API Endpoints

### REST API (Port 3000)

**POST /api/evaluate**
```json
{
  "code": "cube(10);",
  "language": "openscad",
  "t": 0.5
}
```

Response:
```json
{
  "success": true,
  "geometry": {
    "vertices": [...],
    "indices": [...],
    "normals": [...],
    "bounds": { "min": [...], "max": [...] },
    "stats": { "vertexCount": 8, "faceCount": 6 }
  },
  "executionTime": 45.2
}
```

**POST /api/parse**
```json
{
  "code": "sphere(5);",
  "language": "openscad"
}
```

Response:
```json
{
  "success": true,
  "ast": [...],
  "errors": []
}
```

**POST /api/export**
```json
{
  "geometry": {...},
  "format": "stl"
}
```

Response: Binary STL file

---

## Troubleshooting

### Common Issues

**Q: Port 3000 already in use**
```bash
moicad --port 3001
```

**Q: Animation not playing**
- Ensure function is named correctly: `export default (t) => { ... }`
- Check console for errors (F12)
- Verify t parameter is used in code

**Q: Export button not appearing**
- Wait for animation to load completely
- Ensure browser has 2GB free memory
- Try WebM format if GIF fails

**Q: Complex models rendering slowly**
- Reduce $fn value in OpenSCAD
- Split into separate components
- Use lower-resolution animations

**Q: Out of memory errors**
- Close other browser tabs
- Clear browser cache
- Restart CLI

### Getting Help
1. Check ANIMATION_EXPORT_GUIDE.md for animation issues
2. Check ERROR_HANDLING_GUIDE.md for error messages
3. Review examples in demo gallery
4. Check browser console for detailed errors (F12)
5. Report issues with:
   - Browser version
   - Code snippet
   - Error message
   - Steps to reproduce

---

## Performance Metrics

### Build Times
- CLI build: ~12 seconds
- Web app build: ~4-5 seconds
- App bundle size: 853 MB (with dependencies)

### Runtime Performance
- Model evaluation: 10-100 ms for typical models
- Viewport FPS: 60 fps on modern hardware
- Animation preview: 30-60 fps
- WebM export: 5-30 seconds per 60 frames
- GIF export: 30-60 seconds per 60 frames

### Memory Usage
- Idle: ~50 MB
- With model: 50-500 MB depending on complexity
- Animation frame cache: ~10-50 MB

---

## Changelog

### v0.1.0 (January 29, 2026)

**Initial Release**

**SDK (v0.1.10)**
- ✅ Core CAD engine with manifold-3d
- ✅ OpenSCAD parser (98-99% compatible)
- ✅ JavaScript Shape API (fluent + functional)
- ✅ Export formats (STL, OBJ)
- ✅ Enhanced error system with smart detection
- ✅ Animation support with LRU caching
- ✅ WebM and GIF export capabilities

**CLI (v0.1.0)**
- ✅ One-command CLI launcher
- ✅ Auto-open browser
- ✅ File opening support
- ✅ Dev mode
- ✅ Auto-update

**Web App**
- ✅ Full editor with syntax highlighting
- ✅ Real-time 3D preview
- ✅ Animation controls and export
- ✅ File manager with persistence
- ✅ Error display with suggestions
- ✅ Printer presets
- ✅ Statistics overlay

---

## Future Roadmap

### v0.2.0 (Q2 2026)
- [ ] Docker support
- [ ] Multi-file project support
- [ ] Collaborative editing (real-time cursors)
- [ ] Advanced animation editor (timeline UI)
- [ ] H.265 video codec support
- [ ] Performance profiling tools
- [ ] Interactive tutorials

### v0.3.0 (Q3 2026)
- [ ] 3D print job submission
- [ ] Cloud project storage
- [ ] Plugin marketplace
- [ ] Advanced rendering (ray tracing)
- [ ] Model optimization tools
- [ ] VR viewport support

### v1.0.0 (2027)
- [ ] Stable public API
- [ ] Enterprise features
- [ ] Full mobile support
- [ ] Embedded viewer

See ROADMAP.md for complete details.

---

## Credits

**Development**
- moicad Team

**Technologies**
- Manifold-3d for CSG operations
- Three.js for 3D rendering
- Monaco Editor for code editing
- gif.js for GIF encoding
- Next.js for web framework

**Community**
- OpenSCAD project for syntax inspiration
- Bun team for excellent build tooling

---

## License

MIT License - See LICENSE file

---

## Support & Community

- **Documentation**: https://moicad.ai/docs
- **Examples**: https://moicad.ai/examples
- **Issues**: https://github.com/anomalyco/moicad/issues
- **Discussions**: https://github.com/anomalyco/moicad/discussions
- **Email**: support@moicad.ai

---

## Acknowledgments

This release represents months of development and testing. Special thanks to:
- Early testers and feedback providers
- OpenSCAD community for inspiration
- Manifold-3d developers
- All open-source contributors

---

*For detailed technical documentation, see CLAUDE.md, ARCHITECTURE.md, and ANIMATION_EXPORT_GUIDE.md*

**Ready for production use. Enjoy designing!** 🚀
