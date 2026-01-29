import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, language } = await request.json();

    // Dynamically import SDK to avoid bundling issues
    const { parse: parseOpenSCAD, evaluate: evaluateAST, initManifoldEngine } = await import('@moicad/sdk/scad');
    const { evaluateJavaScript } = await import('@moicad/sdk/runtime');

    // Initialize manifold engine
    await initManifoldEngine();

    let result;
    const startTime = performance.now();

    if (language === 'javascript') {
      result = await evaluateJavaScript(code);
    } else {
      // OpenSCAD mode
      const parseResult = parseOpenSCAD(code);
      if (!parseResult.success || !parseResult.ast) {
        return NextResponse.json({
          success: false,
          errors: parseResult.errors,
          geometry: null,
          executionTime: 0
        });
      }
      result = await evaluateAST(parseResult.ast);
    }

    const executionTime = performance.now() - startTime;

    return NextResponse.json({
      success: true,
      geometry: result.geometry,
      errors: result.errors || [],
      executionTime
    });
  } catch (error: any) {
    console.error('Evaluation error:', error);
    return NextResponse.json({
      success: false,
      errors: [error.message || 'Unknown evaluation error'],
      geometry: null,
      executionTime: 0
    }, { status: 500 });
  }
}
