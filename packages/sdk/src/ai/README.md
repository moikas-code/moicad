# @moicad/sdk/ai - AI 3D Generation Module

AI-powered 3D model generation using [fal.ai](https://fal.ai) integration.

## Features

- **Text-to-3D**: Generate 3D models from text descriptions
- **Image-to-3D**: Convert 2D images to 3D models
- **Mesh Refinement**: Improve existing models with Ultrashape
- **OpenSCAD Integration**: Use AI models in OpenSCAD code via `ai_import()`
- **Storage Options**: Memory, filesystem, or browser storage
- **TypeScript Support**: Full type safety and IntelliSense

## Installation

```bash
bun add @moicad/sdk
# or
npm install @moicad/sdk
```

## Quick Start

```typescript
import { AIGenerator, MemoryModelStorage } from '@moicad/sdk/ai';

// 1. Create generator
const ai = new AIGenerator({
  apiKey: 'fal_...',  // Get from https://fal.ai
  storage: new MemoryModelStorage()
});

// 2. Generate from text
const result = await ai.generateFromText({
  prompt: "modern office chair",
  mode: 'full',
  onProgress: (p) => console.log(`${p}%`)
});

console.log(`Model ID: ${result.modelId}`);
console.log(`Polycount: ${result.geometry.stats.vertexCount}`);

// 3. Use in OpenSCAD
const code = `ai_import("${result.modelId}");`;
```

## API Reference

### AIGenerator

#### Constructor

```typescript
new AIGenerator(config: AIGeneratorConfig)
```

**Config:**
- `apiKey: string` - Your fal.ai API key
- `storage?: ModelStorage` - Optional storage backend

#### Methods

##### generateFromText()

```typescript
async generateFromText(params: TextTo3DParams): Promise<GenerationResult>
```

Generate 3D model from text prompt.

**Parameters:**
- `prompt: string` - Text description (max 600 chars)
- `mode?: 'preview' | 'full'` - Generation mode (default: 'full')
  - `preview`: Faster, untextured (5-10 min)
  - `full`: Textured, higher quality (10-15 min)
- `artStyle?: 'realistic' | 'sculpture'` - Art style (default: 'realistic')
- `topology?: 'quad' | 'triangle'` - Mesh topology (default: 'triangle')
- `polycount?: number` - Target polygon count (default: 30000)
- `enablePBR?: boolean` - Enable PBR materials (default: false)
- `onProgress?: (progress: number) => void` - Progress callback

**Example:**
```typescript
const result = await ai.generateFromText({
  prompt: "a sleek sports car",
  mode: 'full',
  artStyle: 'realistic',
  polycount: 50000,
  onProgress: (p) => console.log(`Progress: ${p}%`)
});
```

##### generateFromImage()

```typescript
async generateFromImage(params: ImageTo3DParams): Promise<GenerationResult>
```

Generate 3D model from image URL.

**Parameters:**
- `imageUrl: string` - Public URL to source image
- `topology?: 'quad' | 'triangle'` - Mesh topology
- `polycount?: number` - Target polygon count
- `shouldTexture?: boolean` - Generate textures (default: true)
- `enablePBR?: boolean` - Enable PBR materials
- `texturePrompt?: string` - Optional text guidance for texturing
- `onProgress?: (progress: number) => void` - Progress callback

##### refineMesh()

```typescript
async refineMesh(params: UltrashapeParams): Promise<GenerationResult>
```

Refine existing mesh using Ultrashape.

**Parameters:**
- `modelId: string` - ID of existing model to refine
- `referenceImageUrl: string` - Reference image for refinement
- `octreeResolution?: number` - Octree resolution (default: 512)
- `inferenceSteps?: number` - Number of inference steps (default: 50)
- `onProgress?: (progress: number) => void` - Progress callback

##### loadModel()

```typescript
async loadModel(modelId: string): Promise<GenerationResult | null>
```

Load model from storage.

##### listModels()

```typescript
async listModels(): Promise<AIModelMetadata[]>
```

List all stored models.

##### deleteModel()

```typescript
async deleteModel(modelId: string): Promise<void>
```

Delete model from storage.

### Storage Backends

#### MemoryModelStorage

In-memory storage (not persistent, good for testing).

```typescript
import { MemoryModelStorage } from '@moicad/sdk/ai';

const storage = new MemoryModelStorage();
const ai = new AIGenerator({ apiKey, storage });
```

#### FileModelStorage

Filesystem storage (Node.js/Bun environments).

```typescript
import { FileModelStorage } from '@moicad/sdk/ai';

const storage = new FileModelStorage('./ai-models');
const ai = new AIGenerator({ apiKey, storage });
```

**Directory structure:**
```
./ai-models/
├── ai-1234/
│   ├── model.glb
│   ├── geometry.json
│   └── metadata.json
└── ai-5678/
    └── ...
```

#### BrowserModelStorage

IndexedDB storage (browser environments, planned for desktop app).

```typescript
import { BrowserModelStorage } from '@moicad/sdk/ai';

const storage = new BrowserModelStorage();
await storage.init();

const ai = new AIGenerator({ apiKey, storage });
```

### OpenSCAD Integration

Use `ai_import("model-id")` to import AI-generated models:

```openscad
// Simple import
ai_import("ai-1234567890");

// With transformations
translate([10, 0, 0])
  rotate([0, 0, 45])
    ai_import("ai-chair-model");

// CSG operations
difference() {
  ai_import("ai-base-model");
  cube([10, 10, 10]);
}

union() {
  ai_import("ai-part-1");
  translate([20, 0, 0])
    ai_import("ai-part-2");
}
```

## Types

### GenerationResult

```typescript
interface GenerationResult {
  modelId: string;           // Unique model identifier
  geometry: Geometry;        // moicad Geometry format
  glbData: ArrayBuffer;      // Original GLB file data
  metadata: AIModelMetadata; // Model metadata
}
```

### AIModelMetadata

```typescript
interface AIModelMetadata {
  id?: string;
  source: 'text-to-3d' | 'image-to-3d' | 'ultrashape';
  prompt?: string;           // Text prompt (if text-to-3d)
  imageUrl?: string;         // Image URL (if image-to-3d)
  createdAt: string;         // ISO timestamp
  polycount: number;         // Vertex count
  thumbnail?: string;        // Thumbnail URL
  glbUrl?: string;           // GLB download URL
}
```

### Geometry

moicad's standard geometry format:

```typescript
interface Geometry {
  vertices: number[];        // [x,y,z, x,y,z, ...]
  indices: number[];         // [i1,i2,i3, ...]
  normals: number[];         // [nx,ny,nz, ...]
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  stats: {
    vertexCount: number;
    faceCount: number;
  };
}
```

## Examples

### Example 1: Text-to-3D with Progress

```typescript
import { AIGenerator } from '@moicad/sdk/ai';

const ai = new AIGenerator({ apiKey: process.env.FAL_API_KEY! });

let lastProgress = 0;
const result = await ai.generateFromText({
  prompt: "a modern coffee mug",
  mode: 'preview',
  onProgress: (progress) => {
    if (progress !== lastProgress) {
      console.log(`Progress: ${progress}%`);
      lastProgress = progress;
    }
  }
});

console.log('Generation complete!');
console.log(`Model: ${result.modelId}`);
console.log(`Vertices: ${result.geometry.stats.vertexCount}`);
```

### Example 2: Image-to-3D

```typescript
const result = await ai.generateFromImage({
  imageUrl: "https://example.com/chair.jpg",
  topology: 'triangle',
  polycount: 20000,
  shouldTexture: true,
  texturePrompt: "wooden texture with natural grain"
});
```

### Example 3: Model Library Management

```typescript
// List all models
const models = await ai.listModels();
console.log(`Total models: ${models.length}`);

models.forEach(model => {
  console.log(`- ${model.id}: "${model.prompt}" (${model.polycount} verts)`);
});

// Load specific model
const loaded = await ai.loadModel(models[0].id!);
if (loaded) {
  console.log('Model loaded:', loaded.geometry.stats);
}

// Delete old models
for (const model of models) {
  const age = Date.now() - new Date(model.createdAt).getTime();
  if (age > 7 * 24 * 60 * 60 * 1000) { // 7 days
    await ai.deleteModel(model.id!);
    console.log(`Deleted old model: ${model.id}`);
  }
}
```

### Example 4: Custom Storage Implementation

```typescript
import type { ModelStorage, GenerationResult, AIModelMetadata } from '@moicad/sdk/ai';

class CloudModelStorage implements ModelStorage {
  constructor(private apiUrl: string) {}

  async save(modelId: string, result: GenerationResult): Promise<void> {
    await fetch(`${this.apiUrl}/models/${modelId}`, {
      method: 'PUT',
      body: JSON.stringify(result)
    });
  }

  async load(modelId: string): Promise<GenerationResult | null> {
    const response = await fetch(`${this.apiUrl}/models/${modelId}`);
    return response.ok ? await response.json() : null;
  }

  async list(): Promise<AIModelMetadata[]> {
    const response = await fetch(`${this.apiUrl}/models`);
    return await response.json();
  }

  async delete(modelId: string): Promise<void> {
    await fetch(`${this.apiUrl}/models/${modelId}`, { method: 'DELETE' });
  }

  async exists(modelId: string): Promise<boolean> {
    const response = await fetch(`${this.apiUrl}/models/${modelId}`, { method: 'HEAD' });
    return response.ok;
  }
}

// Use custom storage
const storage = new CloudModelStorage('https://api.example.com');
const ai = new AIGenerator({ apiKey, storage });
```

## Best Practices

### 1. API Key Security

Never hardcode API keys:

```typescript
// ❌ Bad
const ai = new AIGenerator({ apiKey: 'fal_1234567890' });

// ✅ Good
const ai = new AIGenerator({ apiKey: process.env.FAL_API_KEY! });
```

In browsers, store encrypted:
```typescript
import { getAPIKey } from '@/lib/api-key-storage';

const apiKey = await getAPIKey('fal.ai');
const ai = new AIGenerator({ apiKey });
```

### 2. Progress Tracking

Always provide user feedback for long operations:

```typescript
const result = await ai.generateFromText({
  prompt: "...",
  onProgress: (p) => {
    updateProgressBar(p);
    if (p < 50) {
      setStatus('Queued...');
    } else {
      setStatus('Generating...');
    }
  }
});
```

### 3. Error Handling

Wrap generation calls in try-catch:

```typescript
try {
  const result = await ai.generateFromText({ prompt: "..." });
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Invalid API key');
  } else if (error.message.includes('timeout')) {
    console.error('Generation timed out');
  } else {
    console.error('Generation failed:', error);
  }
}
```

### 4. Storage Management

Clean up old models periodically:

```typescript
async function cleanupOldModels(ai: AIGenerator, maxAge: number) {
  const models = await ai.listModels();
  const now = Date.now();

  for (const model of models) {
    const age = now - new Date(model.createdAt).getTime();
    if (age > maxAge) {
      await ai.deleteModel(model.id!);
    }
  }
}

// Clean up models older than 30 days
await cleanupOldModels(ai, 30 * 24 * 60 * 60 * 1000);
```

## Performance

### Generation Times

- **Preview mode**: 5-10 minutes
- **Full mode**: 10-15 minutes
- **Image-to-3D**: 8-12 minutes
- **Ultrashape**: 5-8 minutes

### Memory Usage

- Generation: ~200MB
- GLB loading: ~50-100MB per model
- Storage: ~1-5MB per model (GLB file)

### Optimization Tips

1. **Use preview mode** for faster iterations
2. **Reduce polycount** for simpler models
3. **Batch operations** when generating multiple models
4. **Cache results** using storage backends
5. **Compress GLB files** before storage (optional)

## Troubleshooting

### "API key not configured"

Make sure to set your fal.ai API key:

```bash
export FAL_API_KEY=fal_...
```

### "Model not found"

The model ID doesn't exist in storage:

```typescript
const exists = await ai.storage.exists(modelId);
if (!exists) {
  console.error('Model not found');
}
```

### "Generation timeout"

fal.ai operations can take 10+ minutes. Ensure proper timeout handling:

```typescript
const timeout = setTimeout(() => {
  console.warn('Generation taking longer than expected...');
}, 60000); // 1 minute warning

try {
  const result = await ai.generateFromText({ prompt: "..." });
} finally {
  clearTimeout(timeout);
}
```

### TypeScript Errors

If you see module resolution errors:

```bash
# Ensure dependencies are installed
bun install

# Rebuild
bun run build
```

## Resources

- [fal.ai Documentation](https://fal.ai/docs)
- [fal.ai JavaScript Client](https://github.com/fal-ai/fal-js)
- [moicad SDK Documentation](https://moicad.moikas.com/docs)
- [OpenSCAD Language Reference](https://en.wikibooks.org/wiki/OpenSCAD_User_Manual)

## License

MIT
