import { NextRequest } from 'next/server';

// Backend URL - connect to existing moicad backend
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:42069';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language } = body as { code?: string; language?: string };
    
    if (!code) {
      return Response.json(
        { error: 'Missing code parameter', success: false },
        { status: 400 }
      );
    }
    
    // Forward request to backend with same resource limits
    const response = await fetch(`${BACKEND_URL}/api/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, language }),
      // Set timeout to 30 seconds
      signal: AbortSignal.timeout(30000),
    });
    
    const result = await response.json() as any;
    
    if (!response.ok) {
      return Response.json(
        { error: result.error || 'Evaluation failed', success: false },
        { status: response.status }
      );
    }
    
    return Response.json(result);
  } catch (error) {
    console.error('Evaluation API error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return Response.json(
          { error: 'Evaluation timeout (30s limit)', success: false },
          { status: 408 }
        );
      }
      
      return Response.json(
        { error: error.message, success: false },
        { status: 500 }
      );
    }
    
    return Response.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}