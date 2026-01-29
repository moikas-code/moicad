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

        // Serve WASM file from node_modules
        if (pathname === '/manifold.wasm' || pathname.includes('manifold')) {
          const path = await import('path');
          const { existsSync } = await import('fs');

          // Search paths for manifold.wasm (in order of preference)
          const searchPaths = [
            // Direct manifold-3d package
            path.join(process.cwd(), 'node_modules', 'manifold-3d', 'manifold.wasm'),
            // In CLI's node_modules (when installed globally)
            path.join(import.meta.dir, '../../node_modules/manifold-3d/manifold.wasm'),
            // In parent node_modules (monorepo)
            path.join(import.meta.dir, '../../../node_modules/manifold-3d/manifold.wasm'),
            // Fallback: search up directory tree
            path.join(import.meta.dir, '../../../../node_modules/manifold-3d/manifold.wasm'),
          ];

          for (const wasmPath of searchPaths) {
            if (existsSync(wasmPath)) {
              try {
                const file = Bun.file(wasmPath);
                return new Response(file, {
                  headers: {
                    'Content-Type': 'application/wasm',
                    'Cache-Control': 'public, max-age=31536000',
                    ...corsHeaders
                  }
                });
              } catch (e) {
                logger.debug(`Failed to serve WASM from ${wasmPath}: ${e}`);
              }
            }
          }

          logger.error(`WASM file not found. Searched paths: ${searchPaths.join(', ')}`);
          return new Response('WASM file not found', { status: 404 });
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

        // Serve static files (index.html, gui-bundle.js, etc.)
        if (pathname === '/' || pathname.startsWith('/gui-bundle') || pathname.endsWith('.js') || pathname.endsWith('.css')) {
          return serveStatic(pathname, options.staticDir);
        }

        return new Response('Not found', { status: 404 });

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
  const { existsSync } = require('fs');
  const { resolve } = require('path');

  // Check common locations
  const possiblePaths = [
    // Production - relative to compiled dist/
    resolve(import.meta.dir, '../static'),
    resolve(import.meta.dir, '../../static'),
    // Development - monorepo
    resolve(process.cwd(), 'packages/cli/static'),
    resolve(process.cwd(), 'static'),
    resolve(__dirname, '../static'),
  ];

  for (const p of possiblePaths) {
    const indexPath = resolve(p, 'index.html');
    if (existsSync(indexPath)) {
      logger.info(`Found static files at: ${p}`);
      return p;
    }
  }

  logger.error('Static files not found. Searched paths:');
  possiblePaths.forEach(p => logger.error(`  - ${p}`));
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
