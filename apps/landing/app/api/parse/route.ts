import { NextRequest } from 'next/server';
import { SCAD } from '@moicad/sdk/scad';
import { ParseResultSchema } from '@moicad/sdk';

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const { code, language = 'openscad' } = await request.json();
    
    if (!code || typeof code !== 'string') {
      return Response.json({
        error: 'Missing or invalid code parameter',
        success: false
      }, { status: 400 });
    }
    
    // Parse using SDK (no manifold initialization needed)
    const result = SCAD.parse(code);
    
    // Validate with Zod schema
    const validatedResult = ParseResultSchema.parse(result);
    
    const parseTime = performance.now() - startTime;
    
    return Response.json({
      ast: validatedResult.ast,
      errors: validatedResult.errors,
      success: validatedResult.success,
      parseTime: Math.round(parseTime * 100) / 100
    });
    
  } catch (error) {
    console.error('Parse API error:', error);
    
    if (error instanceof Error) {
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

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // 10 seconds
export const runtime = 'nodejs';