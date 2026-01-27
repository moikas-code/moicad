import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:42069';

export async function POST(request: NextRequest) {
  try {
    const { code, language } = await request.json() as { code?: string; language?: string };
    
    if (!code) {
      return Response.json(
        { error: 'Missing code parameter', success: false },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${BACKEND_URL}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
      signal: AbortSignal.timeout(10000), // 10 second timeout for parsing
    });
    
    const result = await response.json() as any;
    
    if (!response.ok) {
      return Response.json(
        { error: result.error || 'Parse failed', success: false },
        { status: response.status }
      );
    }
    
    return Response.json(result);
  } catch (error) {
    console.error('Parse API error:', error);
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return Response.json(
        { error: 'Parse timeout', success: false },
        { status: 408 }
      );
    }
    
    return Response.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}