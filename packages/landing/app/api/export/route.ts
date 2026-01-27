import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:42069';

export async function POST(request: NextRequest) {
  try {
    const { geometry, format } = await request.json() as { 
      geometry?: any; 
      format?: string 
    };
    
    if (!geometry || !format) {
      return Response.json(
        { error: 'Missing geometry or format parameter', success: false },
        { status: 400 }
      );
    }
    
    if (!['stl', 'obj'].includes(format)) {
      return Response.json(
        { error: 'Unsupported format. Use "stl" or "obj"', success: false },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${BACKEND_URL}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geometry, format }),
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      return Response.json(
        { error: 'Export failed', success: false },
        { status: response.status }
      );
    }
    
    // Return binary data
    const buffer = await response.arrayBuffer();
    const contentType = format === 'stl' ? 'application/octet-stream' : 'model/obj';
    const filename = `model.${format}`;
    
    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export API error:', error);
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return Response.json(
        { error: 'Export timeout', success: false },
        { status: 408 }
      );
    }
    
    return Response.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}