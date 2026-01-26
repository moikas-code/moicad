import { parseOpenSCAD } from './scad-parser';
import { evaluateAST } from './scad-evaluator';
import type { ParseResult, EvaluateResult } from '../shared/types';

// Simple test server without middleware
const server = Bun.serve({
  port: 3000,
  hostname: '0.0.0.0',
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (path === '/health' && req.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Evaluate endpoint
    if (path === '/api/evaluate' && req.method === 'POST') {
      try {
        const body = await req.json();
        const code = body.code;

        // Parse
        const parseResult = parseOpenSCAD(code);
        if (!parseResult.success || !parseResult.ast) {
          return new Response(JSON.stringify({
            geometry: null,
            errors: parseResult.errors,
            success: false,
            executionTime: 0,
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Evaluate
        const evalResult = await evaluateAST(parseResult.ast, { previewMode: true });
        return new Response(JSON.stringify(evalResult), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      } catch (err: any) {
        return new Response(JSON.stringify({
          geometry: null,
          errors: [{ message: err.message }],
          success: false,
          executionTime: 0,
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    return new Response('Not found', { status: 404 });
  },
});

console.log(`🏗️  Simple backend running on http://localhost:3000`);
console.log(`Health: http://localhost:3000/health`);
console.log(`API:   http://localhost:3000/api/evaluate`);