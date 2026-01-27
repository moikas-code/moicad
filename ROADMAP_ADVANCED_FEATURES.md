# moicad Advanced Features Roadmap

**Current Status:** JavaScript API v1.0.0 - Production Ready ✅

This roadmap outlines advanced features to extend moicad beyond the current production-ready state. All features listed are **optional enhancements** - the core API is fully functional.

---

## Phase 6: Animation & Dynamic Models

### 6.1 Animation Support ($t variable)
**Goal:** Enable time-based animations and dynamic models

**Features:**
- [ ] Implement $t (time) special variable (0.0 to 1.0)
- [ ] Animation timeline scrubber in frontend
- [ ] Play/pause controls
- [ ] FPS control (1-60 fps)
- [ ] Export animation as image sequence
- [ ] GIF/video export (using ffmpeg)

**API Changes:**
```javascript
import { Shape } from 'moicad';

// $t available as global in animation mode
const angle = $t * 360;
export default Shape.cube(10).rotate([0, 0, angle]);
```

**Backend:**
- Add `$t` to global scope in runtime.ts
- Render multiple frames with different $t values
- Frame interpolation for smooth animation

**Frontend:**
- Animation controls component
- Timeline scrubber
- Frame export UI

**Estimated Effort:** 2-3 days
**Priority:** Medium
**Dependencies:** None

---

### 6.2 Keyframe Animation
**Goal:** Define complex animations with keyframes

**Features:**
- [ ] Keyframe definition API
- [ ] Easing functions (linear, ease-in, ease-out, etc.)
- [ ] Multi-property animation
- [ ] Animation composition

**API:**
```javascript
import { Shape, animate } from 'moicad';

const anim = animate({
  duration: 5, // seconds
  keyframes: [
    { time: 0, position: [0, 0, 0], rotation: [0, 0, 0] },
    { time: 2, position: [10, 0, 0], rotation: [0, 0, 180], easing: 'ease-in-out' },
    { time: 5, position: [0, 0, 0], rotation: [0, 0, 360], easing: 'ease-out' }
  ]
});

export default Shape.cube(10).animate(anim);
```

**Estimated Effort:** 1 week
**Priority:** Low
**Dependencies:** Phase 6.1

---

## Phase 7: Materials & Textures

### 7.1 Material System
**Goal:** Advanced material properties beyond simple colors

**Features:**
- [ ] Material presets (metal, plastic, wood, glass)
- [ ] PBR properties (metallic, roughness, emissive)
- [ ] Opacity/transparency
- [ ] Reflectivity

**API:**
```javascript
const mat = {
  color: [1, 0, 0],
  metallic: 0.8,
  roughness: 0.2,
  opacity: 1.0,
  emissive: [0, 0, 0]
};

const cube = Shape.cube(10).material(mat);

// Or use presets
const metalCube = Shape.cube(10).material('aluminum');
const glassSphere = Shape.sphere(5).material('glass');
```

**Frontend:**
- Upgrade Three.js materials from basic to PBR
- Material editor UI
- Real-time preview

**Estimated Effort:** 1 week
**Priority:** Medium
**Dependencies:** None

---

### 7.2 Texture Mapping
**Goal:** Apply images/patterns to surfaces

**Features:**
- [ ] UV mapping support
- [ ] Image texture loading
- [ ] Procedural textures (noise, checker, etc.)
- [ ] Normal maps for detail
- [ ] Texture transforms (scale, rotate, offset)

**API:**
```javascript
const textured = Shape.cube(10).texture({
  diffuse: 'wood.jpg',
  normal: 'wood_normal.jpg',
  scale: [2, 2],
  rotation: 45
});

// Procedural textures
const checker = Shape.sphere(10).texture({
  type: 'checker',
  colors: ['#ff0000', '#ffffff'],
  scale: 4
});
```

**Backend:**
- Add texture info to geometry metadata
- Texture file loading and validation

**Frontend:**
- Texture loader integration
- UV coordinate generation
- Texture preview panel

**Estimated Effort:** 2 weeks
**Priority:** Low
**Dependencies:** Phase 7.1

---

## Phase 8: Advanced Geometry Operations

### 8.1 Morphing & Blending
**Goal:** Smooth transitions between shapes

**Features:**
- [ ] Shape morphing (interpolate between two shapes)
- [ ] Blend modes (smooth union, chamfer, fillet)
- [ ] Soft CSG operations

**API:**
```javascript
import { morph, blend } from 'moicad';

// Morph between shapes
const morphed = morph(cube, sphere, 0.5); // 50% between

// Smooth union (rounded intersection)
const smooth = blend.smoothUnion(cube, sphere, 0.2); // radius

// Chamfered union
const chamfered = blend.chamferUnion(cube, sphere, 1.0); // size
```

**Backend:**
- Implement morphing algorithms
- Add smooth CSG operations from manifold-3d

**Estimated Effort:** 1 week
**Priority:** Low
**Dependencies:** None

---

### 8.2 Mesh Operations
**Goal:** Advanced mesh manipulation

**Features:**
- [ ] Subdivision surface (smooth mesh)
- [ ] Decimation (reduce polygon count)
- [ ] Remeshing (uniform triangulation)
- [ ] Mesh repair (fix non-manifold geometry)

**API:**
```javascript
// Subdivision for smooth surfaces
const smooth = cube.subdivide(2); // 2 levels

// Reduce polygon count
const simplified = complexModel.decimate(0.5); // 50% reduction

// Uniform triangulation
const remeshed = model.remesh(targetEdgeLength);

// Fix geometry issues
const fixed = brokenModel.repair();
```

**Backend:**
- Integrate mesh processing library (OpenMesh, libigl)
- Add to manifold pipeline

**Estimated Effort:** 2 weeks
**Priority:** Medium
**Dependencies:** None

---

### 8.3 Lattice & Array Modifiers
**Goal:** Procedural repetition and deformation

**Features:**
- [ ] Linear arrays (repeat along axis)
- [ ] Circular arrays (repeat around center)
- [ ] Lattice deformation (bend, twist, stretch)
- [ ] Path arrays (repeat along curve)

**API:**
```javascript
// Linear array
const array = cube.array({
  count: 10,
  spacing: [15, 0, 0]
});

// Circular array
const circular = tooth.arrayCircular({
  count: 12,
  radius: 20,
  axis: [0, 0, 1]
});

// Lattice deformation
const bent = cylinder.lattice({
  type: 'bend',
  angle: 90,
  axis: 'z'
});
```

**Estimated Effort:** 1 week
**Priority:** Low
**Dependencies:** None

---

## Phase 9: Import/Export Enhancements

### 9.1 Additional Import Formats
**Goal:** Import common 3D file formats

**Features:**
- [ ] Import STL files
- [ ] Import OBJ files
- [ ] Import STEP files (engineering)
- [ ] Import 3MF files (3D printing)
- [ ] Import DXF files (2D profiles)

**API:**
```javascript
import { importSTL, importOBJ, importSTEP } from 'moicad';

const model = await importSTL('model.stl');
const mesh = await importOBJ('mesh.obj');
const cad = await importSTEP('part.step');

// Use as regular shapes
export default model.union(mesh).translate([10, 0, 0]);
```

**Backend:**
- File parsing libraries for each format
- Conversion to manifold representation
- Validation and repair

**Estimated Effort:** 2-3 weeks
**Priority:** High (STL/OBJ), Medium (STEP/3MF)
**Dependencies:** None

---

### 9.2 Additional Export Formats
**Goal:** Export to more formats

**Features:**
- [ ] Export to 3MF (with colors/materials)
- [ ] Export to STEP (engineering CAD)
- [ ] Export to GLTF/GLB (web 3D)
- [ ] Export to AMF (additive manufacturing)
- [ ] Export to SVG (2D projections)

**API:**
```javascript
// Already have .toSTL() and .toOBJ()
model.to3MF(); // With materials
model.toSTEP(); // Engineering format
model.toGLTF(); // Web format
model.toAMF(); // 3D printing
model.toSVG({ view: 'top' }); // 2D projection
```

**Backend:**
- Format serializers for each type
- Metadata preservation (colors, materials)

**Estimated Effort:** 2 weeks
**Priority:** Medium
**Dependencies:** Phase 7.1 (for materials)

---

## Phase 10: CAM & Manufacturing

### 10.1 Slicing Preview
**Goal:** Preview 3D print slicing

**Features:**
- [ ] Layer-by-layer slicing preview
- [ ] Layer height control
- [ ] Infill pattern preview
- [ ] Support structure visualization
- [ ] Print time/material estimation

**API:**
```javascript
const slicer = model.slice({
  layerHeight: 0.2,
  infill: 20,
  infillPattern: 'grid',
  supports: true
});

const preview = slicer.preview(); // Visual layers
const gcode = slicer.toGCode(); // Export
const stats = slicer.getStats(); // Time, material, etc.
```

**Backend:**
- Integrate slicing library (CuraEngine, PrusaSlicer)
- G-code generation
- Print statistics calculation

**Frontend:**
- Layer preview slider
- Slicing settings UI
- Print statistics display

**Estimated Effort:** 3 weeks
**Priority:** High (for 3D printing users)
**Dependencies:** None

---

### 10.2 CNC Toolpath Generation
**Goal:** Generate toolpaths for CNC machining

**Features:**
- [ ] 2D profile milling
- [ ] 3D surface machining
- [ ] Pocket clearing
- [ ] Drilling operations
- [ ] Toolpath visualization

**API:**
```javascript
const toolpath = model.generateToolpath({
  operation: 'profile',
  tool: {
    diameter: 6,
    type: 'endmill'
  },
  depth: 10,
  stepOver: 0.5
});

const gcode = toolpath.toGCode(); // Export
const preview = toolpath.preview(); // Visualization
```

**Backend:**
- CAM library integration (OpenCAMLib)
- G-code generation
- Collision detection

**Estimated Effort:** 4 weeks
**Priority:** Medium
**Dependencies:** None

---

## Phase 11: Collaboration & Version Control

### 11.1 Real-time Collaboration
**Goal:** Multiple users editing same model

**Features:**
- [ ] WebSocket-based real-time sync
- [ ] Collaborative cursors
- [ ] Change highlighting
- [ ] Conflict resolution
- [ ] User presence indicators

**Architecture:**
- Operational Transform (OT) or CRDT for sync
- WebSocket connection per user
- Shared editing sessions

**Frontend:**
- Collaborative editor component
- User avatars and cursors
- Change notifications

**Backend:**
- Session management
- Change broadcasting
- Conflict resolution

**Estimated Effort:** 3 weeks
**Priority:** Medium
**Dependencies:** None

---

### 11.2 Version Control Integration
**Goal:** Git-like versioning for CAD models

**Features:**
- [ ] Version history/timeline
- [ ] Branch/merge support
- [ ] Diff visualization (geometry changes)
- [ ] Revert to previous versions
- [ ] Tag important versions

**API:**
```javascript
// Save version
await model.save('Added mounting holes');

// View history
const history = await model.getHistory();

// Revert
await model.revert('abc123');

// Branch
await model.branch('feature/rounded-edges');

// Compare versions
const diff = await model.diff('v1.0', 'v2.0');
```

**Backend:**
- Version storage (database or git backend)
- Geometry diffing algorithm
- Branch/merge logic

**Frontend:**
- Timeline visualization
- Diff viewer (side-by-side comparison)
- Version management UI

**Estimated Effort:** 2 weeks
**Priority:** Medium
**Dependencies:** None

---

## Phase 12: IDE & Developer Tools

### 12.1 VSCode Extension
**Goal:** Native VSCode support for moicad

**Features:**
- [ ] Syntax highlighting for .moicad.js files
- [ ] Live preview panel
- [ ] Inline geometry visualization
- [ ] Error highlighting
- [ ] Code completion (IntelliSense)
- [ ] Snippets library

**Components:**
- VSCode extension (TypeScript)
- Preview panel using webview
- Language server integration

**Estimated Effort:** 2 weeks
**Priority:** High (for developer experience)
**Dependencies:** None

---

### 12.2 Debugging Tools
**Goal:** Better debugging experience

**Features:**
- [ ] Step-by-step execution
- [ ] Variable inspection
- [ ] Geometry breakpoints (inspect at any stage)
- [ ] Performance profiling
- [ ] Memory usage tracking

**API:**
```javascript
import { debug } from 'moicad';

// Add breakpoint
const model = debug.breakpoint(
  Shape.cube(10).union(Shape.sphere(5)),
  'After union'
);

// Performance profiling
const profile = debug.profile(() => {
  // Complex operations
});

console.log('Execution time:', profile.time);
console.log('Memory usage:', profile.memory);
```

**Frontend:**
- Debug panel in UI
- Step controls
- Variable inspector

**Estimated Effort:** 1 week
**Priority:** Medium
**Dependencies:** None

---

### 12.3 Plugin System
**Goal:** Extensible architecture for community plugins

**Features:**
- [ ] Plugin API
- [ ] Plugin marketplace
- [ ] Hot reload plugins
- [ ] Plugin sandboxing
- [ ] Plugin manager UI

**Plugin API:**
```javascript
// Plugin structure
export default {
  name: 'custom-operations',
  version: '1.0.0',

  // Add custom methods to Shape
  extendShape: {
    customBevel(radius) {
      // Implementation
    }
  },

  // Add custom UI components
  components: [
    { name: 'CustomPanel', component: CustomPanel }
  ]
};
```

**Estimated Effort:** 2 weeks
**Priority:** Medium
**Dependencies:** None

---

## Phase 13: AI & Generative Design

### 13.1 Natural Language to CAD
**Goal:** Generate models from text descriptions

**Features:**
- [ ] Text-to-CAD using Claude/GPT-4
- [ ] Iterative refinement
- [ ] Template library
- [ ] Style transfer

**API:**
```javascript
import { generateFromText } from 'moicad';

// Generate from description
const model = await generateFromText(
  'Create a bolt with 20mm length and 6mm diameter'
);

// Refine
const refined = await model.refine(
  'Make the head hexagonal and add thread grooves'
);
```

**Backend:**
- LLM integration (Claude API, OpenAI API)
- Prompt engineering for CAD generation
- Code generation and validation

**Frontend:**
- Natural language input
- Generation progress indicator
- Iteration UI

**Estimated Effort:** 2 weeks
**Priority:** High (cutting edge feature)
**Dependencies:** None (MCP already exists)

---

### 13.2 Generative Design
**Goal:** AI-optimized designs based on constraints

**Features:**
- [ ] Topology optimization
- [ ] Constraint-based generation
- [ ] Multi-objective optimization
- [ ] Strength analysis integration

**API:**
```javascript
import { optimize } from 'moicad';

const optimized = await optimize({
  baseShape: bracket,
  constraints: {
    volume: { max: 1000 }, // mm³
    strength: { min: 500 }, // N
    attachPoints: [
      { position: [0, 0, 0], fixed: true },
      { position: [50, 0, 0], fixed: true }
    ]
  },
  objectives: ['minimizeWeight', 'maximizeStrength']
});
```

**Backend:**
- Optimization algorithms (genetic, gradient-based)
- FEA integration for strength analysis
- Iterative geometry generation

**Estimated Effort:** 4+ weeks (complex)
**Priority:** Low (experimental)
**Dependencies:** FEA library

---

## Phase 14: Analysis & Simulation

### 14.1 Finite Element Analysis (FEA)
**Goal:** Structural analysis of designs

**Features:**
- [ ] Stress analysis
- [ ] Displacement visualization
- [ ] Safety factor calculation
- [ ] Multiple load cases
- [ ] Material properties database

**API:**
```javascript
import { analyze } from 'moicad';

const results = await analyze.stress({
  model: bracket,
  material: 'aluminum',
  loads: [
    { position: [25, 0, 0], force: [0, 0, -1000] } // 1000N down
  ],
  constraints: [
    { position: [0, 0, 0], fixed: true }
  ]
});

console.log('Max stress:', results.maxStress, 'MPa');
console.log('Safety factor:', results.safetyFactor);
```

**Backend:**
- FEA library integration (CalculiX, Code_Aster)
- Mesh generation for analysis
- Results processing

**Frontend:**
- Stress visualization (color mapping)
- Displacement animation
- Results panel

**Estimated Effort:** 3+ weeks
**Priority:** Medium (for engineering users)
**Dependencies:** Mesh processing

---

### 14.2 Fluid Simulation
**Goal:** CFD analysis for designs

**Features:**
- [ ] Airflow simulation
- [ ] Pressure distribution
- [ ] Turbulence visualization
- [ ] Drag coefficient calculation

**API:**
```javascript
const cfd = await analyze.fluid({
  model: airfoil,
  fluid: 'air',
  velocity: [10, 0, 0], // 10 m/s
  temperature: 20 // °C
});

console.log('Drag coefficient:', cfd.dragCoefficient);
console.log('Lift coefficient:', cfd.liftCoefficient);
```

**Estimated Effort:** 4+ weeks (very complex)
**Priority:** Low (specialized)
**Dependencies:** CFD library, extensive compute

---

## Phase 15: Cloud & Services

### 15.1 Cloud Rendering
**Goal:** Offload heavy rendering to cloud

**Features:**
- [ ] Cloud-based evaluation
- [ ] Distributed rendering
- [ ] Result caching
- [ ] Render farm integration

**Architecture:**
- Backend workers in cloud (AWS Lambda, GCP Functions)
- Job queue (Redis, RabbitMQ)
- S3/GCS for result storage

**Estimated Effort:** 2 weeks
**Priority:** Low (for very complex models)
**Dependencies:** Cloud infrastructure

---

### 15.2 Model Sharing Platform
**Goal:** Community platform for sharing models

**Features:**
- [ ] Public model gallery
- [ ] User profiles
- [ ] Model marketplace
- [ ] Remix/fork functionality
- [ ] Likes, comments, ratings

**Stack:**
- Database (PostgreSQL)
- Storage (S3/GCS)
- Authentication (Auth0, Clerk)
- Search (Elasticsearch)

**Estimated Effort:** 4+ weeks
**Priority:** Medium (community building)
**Dependencies:** Database, authentication system

---

## Implementation Priority Matrix

### High Priority (Next 6 months)
1. **Import/Export (STL/OBJ)** - Phase 9.1 (2-3 weeks)
2. **VSCode Extension** - Phase 12.1 (2 weeks)
3. **Natural Language to CAD** - Phase 13.1 (2 weeks)
4. **Slicing Preview** - Phase 10.1 (3 weeks)

**Total: 9-10 weeks**

### Medium Priority (6-12 months)
1. **Material System** - Phase 7.1 (1 week)
2. **Animation Support** - Phase 6.1 (2-3 days)
3. **Mesh Operations** - Phase 8.2 (2 weeks)
4. **Real-time Collaboration** - Phase 11.1 (3 weeks)
5. **Version Control** - Phase 11.2 (2 weeks)
6. **FEA Analysis** - Phase 14.1 (3+ weeks)

**Total: 11-12 weeks**

### Low Priority (12+ months)
1. **Texture Mapping** - Phase 7.2 (2 weeks)
2. **Morphing/Blending** - Phase 8.1 (1 week)
3. **CNC Toolpath** - Phase 10.2 (4 weeks)
4. **Generative Design** - Phase 13.2 (4+ weeks)
5. **Plugin System** - Phase 12.3 (2 weeks)
6. **Cloud Rendering** - Phase 15.1 (2 weeks)

**Total: 15+ weeks**

---

## Quick Wins (1-2 weeks each)

These features provide high value with relatively low effort:

1. **Material Presets** (Phase 7.1) - 1 week
   - 5-10 PBR material presets
   - Instant visual improvement

2. **Animation Timeline** (Phase 6.1) - 2-3 days
   - Simple $t variable support
   - Timeline scrubber UI

3. **VSCode Extension** (Phase 12.1) - 2 weeks
   - Syntax highlighting
   - Live preview panel

4. **Natural Language to CAD** (Phase 13.1) - 2 weeks
   - Leverage existing MCP server
   - Simple prompt engineering

5. **Debugging Tools** (Phase 12.2) - 1 week
   - Breakpoints and profiling
   - Performance insights

**Total Quick Wins: 6-7 weeks of implementation**

---

## Technical Dependencies

### Required Libraries
- **FEA:** CalculiX, Code_Aster
- **CFD:** OpenFOAM, SU2
- **CAM:** OpenCAMLib
- **Slicing:** CuraEngine, PrusaSlicer
- **Mesh Processing:** OpenMesh, libigl
- **Animation:** Custom or GSAP integration

### Infrastructure
- **Cloud:** AWS/GCP for rendering
- **Database:** PostgreSQL for sharing platform
- **Storage:** S3/GCS for models
- **Auth:** Auth0/Clerk for users

---

## Success Metrics

### Phase 6-8 (Geometry & Visuals)
- [ ] 50+ material presets available
- [ ] Animation export working
- [ ] Mesh operations functional

### Phase 9-10 (Manufacturing)
- [ ] Import/export 5+ formats
- [ ] Slicing preview operational
- [ ] Print time estimation accurate

### Phase 11-12 (Collaboration & Tools)
- [ ] Real-time collaboration with 100+ concurrent users
- [ ] VSCode extension 1000+ downloads
- [ ] Version control handling 10K+ versions

### Phase 13 (AI)
- [ ] Text-to-CAD 90%+ success rate
- [ ] Generative design producing usable results

### Phase 14-15 (Analysis & Cloud)
- [ ] FEA results match commercial software
- [ ] Cloud rendering handling 1000+ jobs/day

---

## Conclusion

This roadmap provides a comprehensive path to extend moicad from its current production-ready state to a world-class CAD platform. The modular structure allows picking and choosing features based on user demand and available resources.

**Recommended Next Steps:**
1. Gather user feedback on priority features
2. Start with Quick Wins (6-7 weeks)
3. Implement High Priority features (9-10 weeks)
4. Iterate based on community needs

**Total Timeline for High Priority Features: ~4 months of focused development**

The JavaScript API foundation is solid, making all these enhancements achievable without major architectural changes.
