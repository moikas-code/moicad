import { NextRequest } from 'next/server';
import { parse, evaluate, initManifoldEngine } from '@moicad/sdk/scad';
import { EvaluateResultSchema } from '@moicad/sdk';

// Global manifold engine initialization
let manifoldInitialized = false;

async function ensureManifoldInitialized() {
  if (!manifoldInitialized) {
    console.log('Initializing Manifold engine...');
    await initManifoldEngine();
    manifoldInitialized = true;
    console.log('Manifold engine initialized');
  }
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    await ensureManifoldInitialized();
    
    const { code, language = 'openscad' } = await request.json();
    
    if (!code || typeof code !== 'string') {
      return Response.json({
        error: 'Missing or invalid code parameter',
        success: false
      }, { status: 400 });
    }
    
    // Parse OpenSCAD code using SDK
    const parseResult = parse(code);
    
    if (!parseResult.success) {
      return Response.json({
        error: `Parse failed: ${parseResult.errors.join(', ')}`,
        success: false,
        errors: parseResult.errors
      }, { status: 400 });
    }
    
    // Evaluate AST to geometry using SDK
    const evalResult = await evaluate(parseResult.ast);
    
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