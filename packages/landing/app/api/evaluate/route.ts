import { NextRequest } from 'next/server';
import { SCAD } from '@moicad/sdk/scad';
import { evaluateJavaScript } from '@moicad/sdk/runtime';
import { EvaluateResultSchema } from '@moicad/sdk';

// Global manifold engine initialization
let manifoldInitialized = false;

async function ensureManifoldInitialized() {
  if (!manifoldInitialized) {
    console.log('Initializing Manifold engine...');
    await SCAD.initManifoldEngine();
    manifoldInitialized = true;
    console.log('Manifold engine initialized');
  }
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    await ensureManifoldInitialized();

    const { code, language = 'javascript' } = await request.json();

    if (!code || typeof code !== 'string') {
      return Response.json({
        error: 'Missing or invalid code parameter',
        success: false
      }, { status: 400 });
    }

    let evalResult;

    if (language === 'javascript') {
      // Evaluate JavaScript code using SDK runtime
      evalResult = await evaluateJavaScript(code, {
        timeout: 30000,
        allowedModules: ['@moicad/sdk', 'moicad']
      });
    } else {
      // Parse and evaluate OpenSCAD code
      const parseResult = SCAD.parse(code);

      if (!parseResult.success) {
        const errorMessages = parseResult.errors.map(e =>
          typeof e === 'string' ? e : e.message || JSON.stringify(e)
        );
        return Response.json({
          error: `Parse failed: ${errorMessages.join(', ')}`,
          success: false,
          errors: errorMessages
        }, { status: 400 });
      }

      evalResult = await SCAD.evaluate(parseResult.ast);
    }

    // Validate result with Zod schema
    const validatedResult = EvaluateResultSchema.parse(evalResult);

    const totalTime = performance.now() - startTime;

    return Response.json({
      geometry: validatedResult.geometry,
      errors: validatedResult.errors,
      success: validatedResult.success,
      executionTime: validatedResult.executionTime,
      totalTime: Math.round(totalTime * 100) / 100
    });
    
  } catch (error) {
    console.error('Evaluation API error:', error);
    
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return Response.json({
          error: 'Evaluation timeout (30s limit)',
          success: false
        }, { status: 408 });
      }
      
      if (error.message.includes('Manifold')) {
        return Response.json({
          error: 'Geometry engine initialization failed',
          success: false
        }, { status: 500 });
      }
      
      return Response.json({
        error: error.message,
        success: false
      }, { status: 500 });
    }
    
    return Response.json({
      error: 'Internal server error',
      success: false
    }, { status: 500 });
  }
}

// Configure route options
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds
export const runtime = 'nodejs';