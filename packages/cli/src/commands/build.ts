/**
 * Build command - Compile OpenSCAD/JS file to geometry JSON
 *
 * Usage: moicad build <file> [-O output.json]
 */

import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { logger } from '../utils/logger';

interface BuildOptions {
  filePath: string;
  output?: string;
}

export async function build(options: BuildOptions) {
  const { filePath, output } = options;

  // Resolve file path
  const resolvedPath = resolve(process.cwd(), filePath);

  if (!existsSync(resolvedPath)) {
    logger.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  // Read the file
  const code = readFileSync(resolvedPath, 'utf-8');
  const ext = filePath.split('.').pop()?.toLowerCase();
  const language = ext === 'scad' ? 'openscad' : 'javascript';

  logger.info(`Building ${filePath}...`);
  logger.info(`Language: ${language}`);

  try {
    // Load SDK
    const { parse, evaluate, initManifoldEngine } = await import('@moicad/sdk/scad');
    const { evaluateJavaScript } = await import('@moicad/sdk/runtime');

    await initManifoldEngine();

    let result: any;
    const startTime = performance.now();

    if (language === 'javascript') {
      result = await evaluateJavaScript(code);
    } else {
      const parseResult = parse(code);
      if (!parseResult.success || !parseResult.ast) {
        logger.error('Parse errors:');
        parseResult.errors?.forEach((e: any) => {
          logger.error(`  Line ${e.line || '?'}: ${e.message}`);
        });
        process.exit(1);
      }
      result = await evaluate(parseResult.ast);
    }

    const buildTime = performance.now() - startTime;

    if (!result.geometry) {
      logger.error('Build failed: No geometry generated');
      if (result.errors?.length > 0) {
        result.errors.forEach((e: any) => {
          logger.error(`  ${e.message}`);
        });
      }
      process.exit(1);
    }

    // Output result
    const outputData = {
      geometry: result.geometry,
      stats: result.geometry.stats,
      buildTime: Math.round(buildTime),
      source: filePath,
      language,
    };

    const jsonOutput = JSON.stringify(outputData, null, 2);

    if (output) {
      const outputPath = resolve(process.cwd(), output);
      writeFileSync(outputPath, jsonOutput);
      logger.success(`Written to ${output}`);
    } else {
      console.log(jsonOutput);
    }

    logger.info(`Build completed in ${Math.round(buildTime)}ms`);
    logger.info(`Vertices: ${result.geometry.stats?.vertexCount || 'N/A'}`);
    logger.info(`Faces: ${result.geometry.stats?.faceCount || 'N/A'}`);

  } catch (error) {
    logger.error(`Build failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
