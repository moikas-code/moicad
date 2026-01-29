/**
 * Export command - Export OpenSCAD/JS file to STL/OBJ
 *
 * Usage: moicad export <file> -f stl|obj [-O output.stl]
 */

import { resolve, basename } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { logger } from '../utils/logger';

interface ExportOptions {
  filePath: string;
  format: 'stl' | 'obj';
  output?: string;
}

export async function exportCommand(options: ExportOptions) {
  const { filePath, format, output } = options;

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

  logger.info(`Exporting ${filePath} to ${format.toUpperCase()}...`);

  try {
    // Load SDK
    const { parse, evaluate, initManifoldEngine } = await import('@moicad/sdk/scad');
    const { evaluateJavaScript } = await import('@moicad/sdk/runtime');
    const { exportSTL, exportOBJ } = await import('@moicad/sdk');

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

    if (!result.geometry) {
      logger.error('Export failed: No geometry generated');
      process.exit(1);
    }

    // Export to format
    let data: ArrayBuffer | string;
    let defaultExt: string;

    if (format === 'stl') {
      data = exportSTL(result.geometry, { binary: true });
      defaultExt = 'stl';
    } else {
      data = exportOBJ(result.geometry);
      defaultExt = 'obj';
    }

    // Determine output path
    const outputPath = output
      ? resolve(process.cwd(), output)
      : resolve(process.cwd(), basename(filePath).replace(/\.[^.]+$/, `.${defaultExt}`));

    // Write file
    if (data instanceof ArrayBuffer) {
      writeFileSync(outputPath, Buffer.from(data));
    } else {
      writeFileSync(outputPath, data);
    }

    const exportTime = performance.now() - startTime;

    logger.success(`Exported to ${outputPath}`);
    logger.info(`Format: ${format.toUpperCase()}`);
    logger.info(`Time: ${Math.round(exportTime)}ms`);
    logger.info(`Vertices: ${result.geometry.stats?.vertexCount || 'N/A'}`);
    logger.info(`Faces: ${result.geometry.stats?.faceCount || 'N/A'}`);

  } catch (error) {
    logger.error(`Export failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
