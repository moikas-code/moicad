/**
 * Evaluate API Handler
 *
 * POST /api/evaluate
 *
 * Evaluates OpenSCAD or JavaScript code and returns geometry.
 * Uses @moicad/sdk for parsing and evaluation.
 */

import { logger } from '../utils/logger';

interface EvaluateRequest {
  code: string;
  language?: 'openscad' | 'javascript';
  t?: number; // Animation parameter (0-1)
  timeout?: number; // Timeout in milliseconds (default: 60000)
  progressDetail?: 'simple' | 'detailed'; // Progress update detail level
}

interface EvaluateResponse {
  success: boolean;
  geometry: any | null;
  errors: Array<{ message: string; line?: number }>;
  executionTime: number;
}

// SDK imports - lazily loaded to avoid startup cost
let sdkLoaded = false;
let parseOpenSCAD: any;
let evaluateAST: any;
let initManifoldEngine: any;
let evaluateJavaScript: any;

async function loadSDK() {
  if (sdkLoaded) return;

  try {
    const scad = await import('@moicad/sdk/scad');
    parseOpenSCAD = scad.parse;
    evaluateAST = scad.evaluate;
    initManifoldEngine = scad.initManifoldEngine;

    const runtime = await import('@moicad/sdk/runtime');
    evaluateJavaScript = runtime.evaluateJavaScript;

    // Initialize manifold engine
    await initManifoldEngine();

    sdkLoaded = true;
    logger.info('SDK loaded and manifold engine initialized');
  } catch (error) {
    logger.error(`Failed to load SDK: ${error}`);
    throw error;
  }
}

export async function handleEvaluate(req: Request): Promise<Response> {
  const startTime = performance.now();

  try {
    // Parse request body
    const body: EvaluateRequest = await req.json();
    const { 
      code, 
      language = 'openscad', 
      t,
      timeout = 60000, // Default 60 seconds
      progressDetail = 'simple'
    } = body;

    if (!code || typeof code !== 'string') {
      return jsonResponse({
        success: false,
        geometry: null,
        errors: [{ message: 'Missing or invalid code parameter' }],
        executionTime: 0,
      }, 400);
    }

    // Validate timeout (min: 5000ms, max: 300000ms / 5 minutes)
    const validatedTimeout = Math.max(5000, Math.min(300000, timeout));

    // Load SDK if not already loaded
    await loadSDK();

    let result: any;

    if (language === 'javascript') {
      // JavaScript evaluation with configurable timeout
      result = await evaluateJavaScript(code, { 
        t,
        timeout: validatedTimeout
      });
    } else {
      // OpenSCAD evaluation
      const parseResult = parseOpenSCAD(code);

      if (!parseResult.success || !parseResult.ast) {
        return jsonResponse({
          success: false,
          geometry: null,
          errors: parseResult.errors || [{ message: 'Parse failed' }],
          executionTime: performance.now() - startTime,
        });
      }

      // Pass timeout to OpenSCAD evaluation as well
      result = await evaluateAST(parseResult.ast, { 
        t,
        timeout: validatedTimeout
      });
    }

    const executionTime = performance.now() - startTime;

    return jsonResponse({
      success: true,
      geometry: result.geometry,
      errors: result.errors || [],
      executionTime,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown evaluation error';
    logger.error(`Evaluation error: ${message}`);

    // Check if it's a timeout error
    const isTimeout = message.toLowerCase().includes('timeout');
    
    return jsonResponse({
      success: false,
      geometry: null,
      errors: [{ 
        message,
        ...(isTimeout && { 
          suggestion: 'Try simplifying your code or increasing the timeout in settings'
        })
      }],
      executionTime: performance.now() - startTime,
    }, isTimeout ? 408 : 500); // 408 Request Timeout for timeouts
  }
}

function jsonResponse(data: EvaluateResponse, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
