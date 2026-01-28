/**
 * Example: AI 3D Generation with fal.ai
 *
 * This example demonstrates how to use the AI generation features
 * in the moicad SDK to create 3D models from text prompts.
 *
 * Prerequisites:
 * 1. Get a fal.ai API key from https://fal.ai
 * 2. Set FAL_API_KEY environment variable
 */

import { AIGenerator, MemoryModelStorage } from '@moicad/sdk/ai';

async function main() {
  // Check for API key
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    console.error('Error: FAL_API_KEY environment variable not set');
    console.error('Get your API key from https://fal.ai and set it:');
    console.error('export FAL_API_KEY=fal_...');
    process.exit(1);
  }

  // Create AI generator with in-memory storage
  const ai = new AIGenerator({
    apiKey,
    storage: new MemoryModelStorage()
  });

  console.log('🚀 Starting AI 3D generation...\n');

  try {
    // Example 1: Generate from text prompt
    console.log('📝 Example 1: Text-to-3D');
    console.log('Generating a modern coffee mug...');

    const result = await ai.generateFromText({
      prompt: 'a modern minimalist coffee mug with smooth curves',
      mode: 'preview', // Use 'preview' for faster results (5-10 min vs 10-15 min)
      artStyle: 'realistic',
      polycount: 10000,
      onProgress: (progress) => {
        console.log(`  Progress: ${progress}%`);
      }
    });

    console.log('✅ Generation complete!');
    console.log(`  Model ID: ${result.modelId}`);
    console.log(`  Vertices: ${result.geometry.stats.vertexCount.toLocaleString()}`);
    console.log(`  Faces: ${result.geometry.stats.faceCount.toLocaleString()}`);
    console.log(`  Bounds: [${result.geometry.bounds.min.map(v => v.toFixed(2))}] to [${result.geometry.bounds.max.map(v => v.toFixed(2))}]`);

    if (result.metadata.thumbnail) {
      console.log(`  Thumbnail: ${result.metadata.thumbnail}`);
    }
    if (result.metadata.glbUrl) {
      console.log(`  GLB URL: ${result.metadata.glbUrl}`);
    }

    // Example 2: Use in OpenSCAD code
    console.log('\n📐 Example 2: Using in OpenSCAD code');
    const scadCode = `
// Import AI-generated model
ai_import("${result.modelId}");

// Can be combined with CSG operations
difference() {
  ai_import("${result.modelId}");
  translate([0, 0, -5])
    cube([20, 20, 10]);
}
`;

    console.log('OpenSCAD code:');
    console.log(scadCode);

    // Example 3: List stored models
    console.log('\n📚 Example 3: Model Library');
    const models = await ai.listModels();
    console.log(`Total models in storage: ${models.length}`);

    models.forEach((model, index) => {
      console.log(`\n  Model ${index + 1}:`);
      console.log(`    Source: ${model.source}`);
      if (model.prompt) {
        console.log(`    Prompt: "${model.prompt}"`);
      }
      console.log(`    Created: ${new Date(model.createdAt).toLocaleString()}`);
      console.log(`    Polycount: ${model.polycount.toLocaleString()}`);
    });

    // Example 4: Load model from storage
    console.log('\n💾 Example 4: Loading model from storage');
    const loadedModel = await ai.loadModel(result.modelId);
    if (loadedModel) {
      console.log('✅ Model loaded successfully');
      console.log(`  Vertices: ${loadedModel.geometry.stats.vertexCount.toLocaleString()}`);
    }

    console.log('\n✨ All examples completed!');
    console.log('\nNext steps:');
    console.log('1. Integrate with OpenSCAD evaluator to use ai_import()');
    console.log('2. Add desktop UI for generation dialog');
    console.log('3. Implement browser storage (IndexedDB) for persistence');

  } catch (error) {
    console.error('❌ Error during generation:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run example
if (import.meta.main || require.main === module) {
  main().catch(console.error);
}

export { main };
