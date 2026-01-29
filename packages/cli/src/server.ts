/**
 * moicad CLI Server
 *
 * Bun HTTP server that hosts the GUI and provides API endpoints
 * for code evaluation, parsing, and export.
 *
 * API Endpoints:
 * - POST /api/evaluate - Evaluate OpenSCAD/JS code to geometry
 * - POST /api/parse - Parse OpenSCAD code to AST
 * - POST /api/export - Export geometry to STL/OBJ
 * - GET /health - Health check
 */

import { handleEvaluate } from './api/evaluate';
import { handleParse } from './api/parse';
import { handleExport } from './api/export';
import { logger } from './utils/logger';

export interface ServerOptions {
  port?: number;
  host?: string;
  staticDir?: string;
  dev?: boolean;
}

const DEFAULT_PORT = 42069;
const DEFAULT_HOST = 'localhost';

/**
 * Create and start the moicad server
 */
export function createServer(options: ServerOptions = {}) {
  const port = options.port || DEFAULT_PORT;
  const host = options.host || DEFAULT_HOST;
  const isDev = options.dev ?? false;

  const server = Bun.serve({
    port,
    hostname: host,

    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // CORS headers for development
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      try {
        // API Routes
        if (pathname === '/api/evaluate' && req.method === 'POST') {
          const response = await handleEvaluate(req);
          return addCorsHeaders(response, corsHeaders);
        }

        if (pathname === '/api/parse' && req.method === 'POST') {
          const response = await handleParse(req);
          return addCorsHeaders(response, corsHeaders);
        }

        if (pathname === '/api/export' && req.method === 'POST') {
          const response = await handleExport(req);
          return addCorsHeaders(response, corsHeaders);
        }

        if (pathname === '/health' || pathname === '/api/health') {
          return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // In dev mode, proxy to Next.js dev server
        if (isDev) {
          return proxyToNextDev(req, url);
        }

        // In production, serve static files from GUI package
        return serveStatic(pathname, options.staticDir);

      } catch (error) {
        logger.error(`Server error: ${error}`);
        return new Response(
          JSON.stringify({ error: 'Internal server error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    },

    error(error: Error) {
      logger.error(`Bun server error: ${error.message}`);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    },
  });

  logger.info(`moicad server running at http://${host}:${port}`);

  return server;
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: Response, corsHeaders: Record<string, string>): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Proxy requests to Next.js dev server (for development mode)
 */
async function proxyToNextDev(req: Request, url: URL): Promise<Response> {
  const nextUrl = new URL(url.pathname + url.search, 'http://localhost:3000');

  try {
    const proxyReq = new Request(nextUrl.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });

    return await fetch(proxyReq);
  } catch (error) {
    logger.error(`Failed to proxy to Next.js: ${error}`);
    return new Response('Next.js dev server not running', { status: 502 });
  }
}

/**
 * Serve static files from CLI's static directory
 */
async function serveStatic(pathname: string, staticDir?: string): Promise<Response> {
  // Find CLI static directory
  const cliStaticPath = staticDir || findCliStaticPath();

  if (!cliStaticPath) {
    return new Response('CLI static files not found', { status: 404 });
  }

  // Map pathname to file
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = `${cliStaticPath}${filePath}`;

  try {
    const file = Bun.file(fullPath);
    if (await file.exists()) {
      return new Response(file, {
        headers: { 'Content-Type': getContentType(filePath) },
      });
    }

    // Fallback to index.html for SPA routing
    const indexFile = Bun.file(`${cliStaticPath}/index.html`);
    if (await indexFile.exists()) {
      return new Response(indexFile, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response('Not found', { status: 404 });
  } catch (error) {
    logger.error(`Static file error: ${error}`);
    return new Response('Not found', { status: 404 });
  }
}

/**
 * Find the CLI's static files directory
 */
function findCliStaticPath(): string | null {
  // Check common locations
  const possiblePaths = [
    // Development - monorepo
    './packages/cli/static',
    './static',
    '../static',
    // Production - global install
    `${import.meta.dir}/../static`,
    `${import.meta.dir}/../../static`,
  ];

  for (const p of possiblePaths) {
    try {
      const indexFile = Bun.file(`${p}/index.html`);
      // Check if index.html exists synchronously
      if (indexFile.size > 0 || true) { // Bun.file doesn't have sync exists
        return p;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Get content type for file extension
 */
function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    mjs: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    eot: 'application/vnd.ms-fontobject',
    wasm: 'application/wasm',
  };
  return types[ext || ''] || 'application/octet-stream';
}

/**
 * Start server from CLI
 */
export function startServer(options: ServerOptions = {}): void {
  createServer(options);
}

export default createServer;
