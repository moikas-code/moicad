import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    // Dynamically import SDK
    const { parse: parseOpenSCAD } = await import('@moicad/sdk/scad');

    const parseResult = parseOpenSCAD(code);

    return NextResponse.json({
      success: parseResult.success,
      ast: parseResult.ast,
      errors: parseResult.errors
    });
  } catch (error: any) {
    console.error('Parse error:', error);
    return NextResponse.json({
      success: false,
      ast: null,
      errors: [error.message || 'Unknown parse error']
    }, { status: 500 });
  }
}
