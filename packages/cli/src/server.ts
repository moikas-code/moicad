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

        // Serve the web UI
        if (pathname === '/') {
          const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>moicad - CAD Editor</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; height: 100vh; background: #1D1D1D; color: #E5E5E5; font-family: system-ui, sans-serif; }
    #editor { width: 100%; height: 100%; }
    #viewport { flex: 1; }
    .resizer {
      cursor: col-resize;
      width: 6px;
      background: #3D3D3D;
      transition: background 0.2s;
    }
    .resizer:hover { background: #4772B3; }
    .resizer.dragging { background: #E66E00; }
  </style>
</head>
<body class="flex flex-col h-screen">
  <!-- Top Bar -->
  <div class="h-12 bg-[#2D2D2D] border-b border-[#3D3D3D] flex items-center px-4 gap-4">
    <h1 class="text-lg font-bold text-[#E5E5E5]">moicad</h1>
    <select id="language" class="bg-[#3D3D3D] text-[#E5E5E5] px-3 py-1 rounded border border-[#4D4D4D] focus:border-[#4772B3] focus:outline-none">
      <option value="javascript">JavaScript</option>
      <option value="openscad">OpenSCAD</option>
    </select>
    <div class="flex-1"></div>
    <button id="run-btn" class="px-4 py-1.5 bg-[#4772B3] hover:bg-[#5A8BC7] text-white font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
      Run
    </button>
  </div>

  <!-- Main Content -->
  <div class="flex-1 flex overflow-hidden" id="main-container">
    <!-- Editor Panel -->
    <div class="flex-1 flex flex-col bg-[#2D2D2D] border-r border-[#3D3D3D]" id="editor-panel" style="flex: 0 0 50%;">
      <div class="px-4 py-2 border-b border-[#3D3D3D] flex justify-between items-center">
        <span class="text-sm font-semibold text-[#B0B0B0]">Code Editor</span>
      </div>
      <div class="flex-1 overflow-hidden">
        <div id="editor"></div>
      </div>
      <div id="error" class="hidden bg-red-900/80 text-red-200 p-3 border-t border-red-950 text-sm font-mono"></div>
    </div>

    <!-- Resizer -->
    <div class="resizer" id="resizer"></div>

    <!-- Viewport Panel -->
    <div class="flex-1 flex flex-col bg-[#2D2D2D]" id="viewport-panel" style="flex: 0 0 50%;">
      <div class="px-4 py-2 border-b border-[#3D3D3D] flex justify-between items-center">
        <span class="text-sm font-semibold text-[#B0B0B0]">3D Viewport</span>
      </div>
      <div class="flex-1 overflow-hidden">
        <div id="viewport"></div>
      </div>
      <div id="stats" class="hidden p-2 bg-[#3D3D3D] border-t border-[#4D4D4D] text-xs text-[#B0B0B0] font-mono"></div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs/loader.js"></script>
  <script type="importmap">
  {
    "imports": {
      "three": "https://esm.sh/three@0.182.0",
      "three/addons/": "https://esm.sh/three@0.182.0/examples/jsm/"
    }
  }
  </script>

  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // Monaco Editor
    let editor;
    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs' }});
    require(['vs/editor/editor.main'], function() {
      editor = monaco.editor.create(document.getElementById('editor'), {
        value: 'import { cube } from "@moicad/sdk";\\n\\nexport default cube(20);',
        language: 'javascript',
        theme: 'vs-dark',
        minimap: { enabled: false },
        fontSize: 14,
        automaticLayout: true
      });
    });

    // Resizable panels
    const resizer = document.getElementById('resizer');
    const editorPanel = document.getElementById('editor-panel');
    const viewportPanel = document.getElementById('viewport-panel');
    const mainContainer = document.getElementById('main-container');
    let isResizing = false;

    resizer.addEventListener('mousedown', () => {
      isResizing = true;
      resizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const containerRect = mainContainer.getBoundingClientRect();
      const offsetX = e.clientX - containerRect.left;
      const percentage = Math.max(20, Math.min(80, (offsetX / containerRect.width) * 100));
      editorPanel.style.flex = \`0 0 \${percentage}%\`;
      viewportPanel.style.flex = \`0 0 \${100 - percentage - 0.5}%\`;
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });

    // Three.js Viewport
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1D1D1D);
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const viewportContainer = document.getElementById('viewport');

    function resizeViewport() {
      const width = viewportContainer.clientWidth;
      const height = viewportContainer.clientHeight;
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    }

    setTimeout(() => {
      resizeViewport();
      viewportContainer.appendChild(renderer.domElement);
    }, 100);

    camera.position.set(30, 30, 30);
    camera.lookAt(0, 0, 0);
    const controls = new OrbitControls(camera, renderer.domElement);

    // Grid and axes
    const gridHelper = new THREE.GridHelper(100, 10, 0x444444, 0x333333);
    scene.add(gridHelper);
    const axesHelper = new THREE.AxesHelper(20);
    scene.add(axesHelper);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    let currentMesh = null;

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', resizeViewport);

    // Run button handler
    document.getElementById('run-btn').addEventListener('click', async () => {
      const code = editor.getValue();
      const language = document.getElementById('language').value;
      const btn = document.getElementById('run-btn');
      const errorDiv = document.getElementById('error');
      const statsDiv = document.getElementById('stats');

      btn.disabled = true;
      btn.textContent = 'Running...';
      errorDiv.classList.add('hidden');

      try {
        const response = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language })
        });

        const result = await response.json();

        if (result.success && result.geometry) {
          if (currentMesh) {
            scene.remove(currentMesh);
            currentMesh.geometry.dispose();
            currentMesh.material.dispose();
          }

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(result.geometry.vertices, 3));
          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(result.geometry.normals, 3));
          geometry.setIndex(result.geometry.indices);

          const material = new THREE.MeshStandardMaterial({
            color: 0x4772B3,
            metalness: 0.3,
            roughness: 0.6
          });

          currentMesh = new THREE.Mesh(geometry, material);
          scene.add(currentMesh);

          statsDiv.classList.remove('hidden');
          statsDiv.textContent = \`Vertices: \${result.geometry.stats.vertexCount} | Faces: \${result.geometry.stats.faceCount}\${result.geometry.stats.volume ? \` | Volume: \${result.geometry.stats.volume.toFixed(2)} mm³\` : ''}\`;
        } else {
          const errors = result.errors?.map(e => e.message).join('\\n') || 'Unknown error';
          errorDiv.textContent = errors;
          errorDiv.classList.remove('hidden');
          statsDiv.classList.add('hidden');
        }
      } catch (error) {
        errorDiv.textContent = 'Error: ' + error.message;
        errorDiv.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Run';
      }
    });
  </script>
</body>
</html>`;

          return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
          });
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
