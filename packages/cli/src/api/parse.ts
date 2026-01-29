/**
 * Parse API Handler
 *
 * POST /api/parse
 *
 * Parses OpenSCAD code and returns the AST.
 * Uses @moicad/sdk for parsing.
 */

import { logger } from '../utils/logger';

interface ParseRequest {
  code: string;
  language?: 'openscad';
}

interface ParseResponse {
  success: boolean;
  ast: any[] | null;
  errors: Array<{ message: string; line?: number; column?: number }>;
  parseTime: number;
}

// SDK imports - lazily loaded
let parseOpenSCAD: any;
let sdkLoaded = false;

async function loadSDK() {
  if (sdkLoaded) return;

  try {
    const scad = await import('@moicad/sdk/scad');
    parseOpenSCAD = scad.parse;
    sdkLoaded = true;
  } catch (error) {
    logger.error(`Failed to load SDK: ${error}`);
    throw error;
  }
}

export async function handleParse(req: Request): Promise<Response> {
  const startTime = performance.now();

  try {
    // Parse request body
    const body: ParseRequest = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return jsonResponse({
        success: false,
        ast: null,
        errors: [{ message: 'Missing or invalid code parameter' }],
        parseTime: 0,
      }, 400);
    }

    // Load SDK if not already loaded
    await loadSDK();

    // Parse the code
    const result = parseOpenSCAD(code);
    const parseTime = performance.now() - startTime;

    return jsonResponse({
      success: result.success,
      ast: result.ast || null,
      errors: result.errors || [],
      parseTime,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    logger.error(`Parse error: ${message}`);

    return jsonResponse({
      success: false,
      ast: null,
      errors: [{ message }],
      parseTime: performance.now() - startTime,
    }, 500);
  }
}

function jsonResponse(data: ParseResponse, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
