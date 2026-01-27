#!/usr/bin/env bun
/**
 * moicad Backend Server
 * Bun.serve() with REST API and WebSocket support
 */

import fs from "fs";
import path from "path";
import net from "net";
import { parseOpenSCAD } from "../scad/parser";
import { evaluateAST, setWasmModule } from "../scad/evaluator";
import { evaluateJavaScript } from "../javascript/runtime";
import { detectLanguage } from "./language-detector";
import type {
  EvaluateMessage,
  EvaluateResponse,
  ParseResult,
  EvaluateResult,
  Geometry,
  ExportResult,
} from "../../shared/types";
import logger, { logInfo, logError, logWarn, logHttp } from "./logger";

// Production middleware imports
import { createRateLimiter, createStrictRateLimiter } from "./rate-limiter";
import {
  securityMiddleware,
  requestTimeout,
  requestSizeLimit,
} from "../middleware/security";
import {
  healthCheck,
  metrics,
  readinessProbe,
  livenessProbe,
} from "../middleware/health";
import { config, validateEnvironment } from "./config";

// Memory optimization imports
import { MemoryMonitor } from "./memory-monitor";
import { bufferPool } from "../utils/buffer-pool";

// MCP imports
import { mcpStore } from "../mcp/store";
import { wsManager } from "../mcp/middleware";
import { mcpWebSocketServer } from "../mcp/server";
import * as mcpApi from "../mcp/api";
import { aiManager } from "../mcp/ai-adapter";

// Dynamic import for WASM
let wasmModule: any = null;

async function initWasm() {
  try {
    // Import and initialize WASM module with cache busting
    const cacheBuster = Date.now();
    const imported = await import(
      `../wasm/pkg/moicad_wasm.js?t=${cacheBuster}`
    );

    // The default export is the init function, call it to initialize
    if (imported.default) {
      await imported.default();
    }

    // Now store the module with all exported functions
    wasmModule = imported;
    globals.wasmModule = imported;
    setWasmModule(imported);
    logInfo("WASM module initialized successfully");
    return true;
  } catch (err) {
    logError("Failed to load WASM module", {
      error: err instanceof Error ? err.message : String(err),
    });
    logWarn(
      "Running without WASM CSG engine - geometry operations will be limited",
    );
    return false;
  }
}

const globals = { wasmModule: null as any };
(globalThis as any).globals = globals;

// ============================================
// Process Management & PID Locking
// ============================================

const PID_FILE = path.join(process.cwd(), ".moicad-backend.pid");
const SERVER_PORT = 42069;

/**
 * Check if another backend process is already running
 * Best practice: Use PID file to prevent multiple instances
 */
function checkExistingProcess(): void {
  if (fs.existsSync(PID_FILE)) {
    const oldPidStr = fs.readFileSync(PID_FILE, "utf8").trim();
    const oldPid = parseInt(oldPidStr, 10);

    if (isNaN(oldPid)) {
      logWarn("Invalid PID in file, removing stale PID file");
      fs.unlinkSync(PID_FILE);
    } else {
      try {
        // Signal 0 checks if process exists without killing it
        process.kill(oldPid, 0);

        // Process exists - backend already running
        console.error(`\n❌ ERROR: Backend already running with PID ${oldPid}`);
        console.error(
          `\nIf you're certain no backend is running, delete: ${PID_FILE}\n`,
        );
        process.exit(1);
      } catch (e) {
        // Process doesn't exist - remove stale PID file
        logInfo("Removed stale PID file from previous run", { oldPid });
        fs.unlinkSync(PID_FILE);
      }
    }
  }

  // Write our PID
  fs.writeFileSync(PID_FILE, String(process.pid));
  logInfo("Backend PID file created", { pid: process.pid });
}

/**
 * Check if the server port is available
 * Best practice: Fail fast if port is already in use
 */
async function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(true);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port, "0.0.0.0");
  });
}

/**
 * Cleanup resources on exit
 * Best practice: Always clean up PID file and resources
 */
function cleanup() {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
      logInfo("PID file removed on exit");
    }
  } catch (e) {
    // Ignore errors during cleanup
  }
}

// Register cleanup handlers
process.on("exit", cleanup);
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down gracefully...");
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  logInfo("Received SIGTERM, shutting down");
  cleanup();
  process.exit(0);
});
process.on("uncaughtException", (err) => {
  logError("Uncaught exception", { error: err.message, stack: err.stack });
  cleanup();
  process.exit(1);
});

/**
 * Worker Pool for handling OpenSCAD evaluations off the main thread
 */
class MainWorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Array<{
    code: string;
    requestId: string;
    resolve: (response: EvaluateResponse) => void;
    reject: (error: any) => void;
  }> = [];
  private idleWorkers: Worker[] = [];
  private pendingRequests = new Map<
    string,
    {
      resolve: (response: EvaluateResponse) => void;
      reject: (error: any) => void;
    }
  >();

  constructor(size: number = 4) {
    // Initialize workers
    for (let i = 0; i < size; i++) {
      this.createWorker();
    }
  }

  private createWorker() {
    // Bun-specific worker creation
    const worker = new Worker(new URL("worker.ts", import.meta.url).href);

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as EvaluateResponse;

      // Handle initialization errors or other non-response messages if any
      if (data.type === "error" && !data.requestId) {
        console.error("Worker error:", data.errors);
        return;
      }

      const pending = this.pendingRequests.get(data.requestId);
      if (pending) {
        this.pendingRequests.delete(data.requestId);
        pending.resolve(data);

        // Return worker to idle pool
        this.idleWorkers.push(worker);
        this.processQueue();
      }
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      // We might need to handle crashing workers here by recreating them
      // For now, simpler error handling:
      // Don't add back to idle pool if it crashed
    };

    this.workers.push(worker);
    this.idleWorkers.push(worker);
  }

  public evaluate(code: string): Promise<EvaluateResponse> {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(7);
      this.taskQueue.push({ code, requestId, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.taskQueue.length === 0 || this.idleWorkers.length === 0) {
      return;
    }

    const worker = this.idleWorkers.pop();
    const task = this.taskQueue.shift();

    if (!worker || !task) return;

    this.pendingRequests.set(task.requestId, {
      resolve: task.resolve,
      reject: task.reject,
    });

    worker.postMessage({
      type: "evaluate",
      code: task.code,
      requestId: task.requestId,
    });
  }
}

// Initialize global worker pool (DISABLED - causing hangs)
// const workerPool = new MainWorkerPool(Math.max(2, navigator.hardwareConcurrency || 4));
const workerPool = null as any; // Disabled for now

// ============================================
// Single Job Evaluation Queue
// ============================================

interface QueuedJob {
    id: string;
    code: string;
    timestamp: number;
    resolve: (result: EvaluateResult) => void;
    reject: (error: Error) => void;
    progressCallback?: (progress: import("../../shared/types").RenderProgress) => void;
    connectionId?: string;
    cancelRequested?: boolean;
  }

/**
 * Single-threaded job queue for OpenSCAD evaluations
 * Best Practice: Only one render at a time, emulating OpenSCAD behavior
 */
class EvaluationQueue {
  private queue: QueuedJob[] = [];
  private processing: boolean = false;
  private currentJob: QueuedJob | null = null;
  private readonly defaultTimeout: number = 30000; // 30 seconds (OpenSCAD-like)
  private readonly memoryMonitor: MemoryMonitor = new MemoryMonitor();

  constructor() {
    // Start memory monitoring
    this.memoryMonitor.startMonitoring(5000); // Check every 5 seconds
  }

  /**
   * Enqueue a new evaluation job with optional progress callback
   * Jobs are processed in FIFO order
   */
  async enqueue(
    code: string,
    connectionId?: string,
    progressCallback?: (progress: import("../../shared/types").RenderProgress) => void
  ): Promise<EvaluateResult> {
    return new Promise((resolve, reject) => {
      const job: QueuedJob = {
        connectionId,
        id: Math.random().toString(36).substring(7),
        code,
        timestamp: Date.now(),
        resolve,
        reject,
        progressCallback,
      };

      this.queue.push(job);
      logInfo(`Job ${job.id} queued`, {
        position: this.queue.length,
        queueSize: this.queue.length,
      });

      // Start processing if not already running
      this.processNext();
    });
  }

  /**
   * Process the next job in the queue
   */
  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    this.currentJob = this.queue.shift()!;

    const { id, code, timestamp, resolve, reject, progressCallback } = this.currentJob;
    const waitTime = Date.now() - timestamp;

    logInfo(`Processing job ${id}`, {
      waitTime: `${waitTime}ms`,
      codeLength: code.length,
    });

    // Helper to send progress updates
    const sendProgress = (stage: import("../../shared/types").RenderStage, progress: number, message: string, details?: any) => {
      if (progressCallback) {
        progressCallback({
          stage,
          progress,
          message,
          details: {
            memoryUsageMB: this.memoryMonitor.getUsageMB(),
            ...details,
          },
        });
      }
    };

    try {
      // Initial progress
      sendProgress("initializing", 0.0, "Starting evaluation...");

      // Set baseline and check memory before evaluation
      this.memoryMonitor.setBaseline();
      const memorySnapshot = this.memoryMonitor.takeSnapshot();
      const pressure = memorySnapshot.pressure;

      // Log pressure level
      logInfo(`Memory pressure before job ${id}: ${pressure.level}`, {
        heapUsedMB: this.memoryMonitor.getUsageMB(),
        pressureLevel: pressure.level,
        recommendation: pressure.recommendation,
      });

      // REMOVED: No longer abort on memory limits - use chunking instead
      // Progressive loading allows any size model to eventually complete
      
      // Optimize if needed (but never abort)
      if (this.memoryMonitor.shouldOptimize()) {
        logWarn(`High memory usage - applying optimization for job ${id}`, {
          heapUsedMB: this.memoryMonitor.getUsageMB(),
          pressureLevel: pressure.level,
          recommendation: pressure.recommendation,
        });

        // Force cleanup before proceeding
        await this.memoryMonitor.forceCleanup();
      }

      // Start chunking if memory pressure is high
      if (this.memoryMonitor.shouldChunk()) {
        logInfo(`Using chunked evaluation for job ${id}`, {
          heapUsedMB: this.memoryMonitor.getUsageMB(),
          pressureLevel: pressure.level,
        });
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, rej) => {
        setTimeout(() => {
          rej(new Error(`Evaluation timeout after ${this.defaultTimeout}ms`));
        }, this.defaultTimeout);
      });

      // Add progress for parsing stage
      sendProgress("parsing", 0.1, "Parsing OpenSCAD code...");

      // Race between evaluation and timeout
      const result = await Promise.race([
        this.evaluateCode(code, sendProgress),
        timeoutPromise,
      ]);

      // Complete progress
      if (result.success) {
        sendProgress("complete", 1.0, "Rendering complete!");
      }

      const executionTime = Date.now() - timestamp;
      resolve(result);
      logInfo(`Job ${id} completed`, {
        executionTime: `${executionTime}ms`,
        success: result.success,
      });
    } catch (error: any) {
      logError(`Job ${id} failed`, { error: error.message });

      // Return error result instead of throwing
      resolve({
        geometry: null,
        errors: [{ message: error.message }],
        success: false,
        executionTime: Date.now() - timestamp,
      });
    } finally {
      this.currentJob = null;
      this.processing = false;

      // Enhanced cleanup with buffer pool and memory monitoring
      await this.performCleanup(id);

      // Process next job
      setImmediate(() => this.processNext());
    }
  }

  /**
   * Perform comprehensive memory cleanup after job completion
   */
  private async performCleanup(jobId: string): Promise<void> {
    // Clean buffer pools
    const poolStats = bufferPool.getStats();
    if (poolStats.memoryUsageBytes > 50 * 1024 * 1024) {
      // > 50MB
      bufferPool.cleanupLargeBuffers();
      logInfo(`Buffer pool cleaned after job ${jobId}`, {
        freedMB: Math.round(poolStats.memoryUsageBytes / 1024 / 1024),
      });
    }

    // Force garbage collection if available
    const gcSuccess = this.memoryMonitor.forceGC();

    // Check for memory leaks
    const leakDetection = this.memoryMonitor.detectLeaks();
    if (leakDetection.isLeak) {
      logWarn(`Memory leak detected after job ${jobId}`, {
        growthRate: leakDetection.growthRate.toFixed(2) + "MB/s",
        confidence: (leakDetection.confidence * 100).toFixed(1) + "%",
        recommendation: leakDetection.recommendation,
      });
    }

    // Log final memory stats
    const summary = this.memoryMonitor.getSummary();
    logInfo(`Cleanup completed for job ${jobId}`, {
      heapUsedMB: Math.round(summary.current.heapUsed / 1024 / 1024),
      growthSinceBaselineMB: summary.growth,
      pressureLevel: summary.pressure.level,
      gcPerformed: gcSuccess,
    });
  }

  /**
   * Evaluate code (OpenSCAD or JavaScript) with progress reporting
   * Auto-detects language and routes to appropriate evaluator
   */
  private async evaluateCode(
    code: string,
    sendProgress: (stage: import("../../shared/types").RenderStage, progress: number, message: string, details?: any) => void
  ): Promise<EvaluateResult> {
    const startTime = performance.now();

    try {
      // Detect language
      const language = detectLanguage(code);
      logInfo(`Code language detected: ${language}`);

      if (language === 'javascript') {
        // JavaScript evaluation path
        sendProgress("parsing", 0.1, "Parsing JavaScript code...");
        sendProgress("evaluating", 0.3, "Executing JavaScript code...");

        const result = await evaluateJavaScript(code);

        sendProgress("serializing", 0.9, "Preparing geometry for display...");

        return {
          geometry: result.geometry,
          errors: result.errors,
          success: result.success,
          executionTime: result.executionTime || (performance.now() - startTime),
        };
      } else {
        // OpenSCAD evaluation path (original logic)
        sendProgress("parsing", 0.1, "Parsing OpenSCAD code...");
        const parseResult = parseOpenSCAD(code);

        if (!parseResult.success || parseResult.errors.length > 0) {
          const executionTime = performance.now() - startTime;
          return {
            geometry: null,
            errors: parseResult.errors,
            success: false,
            executionTime,
          };
        }

        // Analyze AST
        sendProgress("analyzing", 0.2, "Analyzing geometry structure...", {
          totalNodes: parseResult.ast.length,
        });

        // Evaluate the AST to generate geometry
        sendProgress("evaluating", 0.3, "Generating geometry...");
        const evalResult = await evaluateAST(parseResult.ast);

        // Serializing
        sendProgress("serializing", 0.9, "Preparing geometry for display...");

        const executionTime = performance.now() - startTime;

        return {
          geometry: evalResult.geometry,
          errors: evalResult.errors,
          success: evalResult.success,
          executionTime,
        };
      }
    } catch (error: any) {
      const executionTime = performance.now() - startTime;

      return {
        geometry: null,
        errors: [{ message: error.message || String(error) }],
        success: false,
        executionTime,
      };
    }
  }

  /**
   * Get queue status for monitoring (includes memory stats)
   */
  getStatus() {
    const memoryStats = this.memoryMonitor.getSummary();
    return {
      pending: this.queue.length,
      isProcessing: this.processing,
      currentJobId: this.currentJob?.id || null,
      memory: {
        heapUsedMB: Math.round(memoryStats.current.heapUsed / 1024 / 1024),
        pressureLevel: memoryStats.pressure.level,
        shouldOptimize: memoryStats.pressure.shouldOptimize,
        shouldChunk: memoryStats.pressure.shouldChunk,
      },
    };
  }
}

// Create global queue instance
const evaluationQueue = new EvaluationQueue();

// Check for existing backend process
checkExistingProcess();

// Check if port is available
const portAvailable = await checkPortAvailable(SERVER_PORT);
if (!portAvailable) {
  console.error(`\n❌ ERROR: Port ${SERVER_PORT} is already in use`);
  console.error("Another backend process may be running\n");
  cleanup(); // Remove PID file we just created
  process.exit(1);
}

// Validate environment before starting server
const envValidation = validateEnvironment();
if (!envValidation.isValid) {
  logError("Environment validation failed", { errors: envValidation.errors });
  if (config.isProduction) {
    cleanup();
    process.exit(1);
  } else {
    logWarn("Continuing with invalid environment (development mode)");
  }
}

// Initialize WASM before starting server
await initWasm();

interface WebSocketData {
  requestId?: string;
  isMCP?: boolean;
  connectionId?: string;
}

const server = Bun.serve<WebSocketData>({
  port: SERVER_PORT,
  hostname: "0.0.0.0",
  reusePort: true, // Allow restarting without waiting for TIME_WAIT

  // Apply security middleware
  ...securityMiddleware,

  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers for all responses
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Health check and monitoring endpoints
    if (path === "/health" && req.method === "GET") {
      return healthCheck(req);
    }

    if (path === "/metrics" && req.method === "GET") {
      return metrics(req);
    }

    if (path === "/ready" && req.method === "GET") {
      return readinessProbe(req);
    }

    if (path === "/live" && req.method === "GET") {
      return livenessProbe(req);
    }

    // Debug health endpoint with queue status
    if (path === "/api/debug/health" && req.method === "GET") {
      const mem = process.memoryUsage();
      const queueStatus = evaluationQueue.getStatus();

      return sendJson({
        status: "healthy",
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        memory: {
          rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(mem.external / 1024 / 1024)}MB`,
        },
        queue: queueStatus,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // WebSocket upgrade for original API
    if (path === "/ws" && req.headers.get("upgrade") === "websocket") {
      return server.upgrade(req, { data: {} }) as any;
    }

    // WebSocket upgrade for MCP
    if (path === "/ws/mcp" && req.headers.get("upgrade") === "websocket") {
      return server.upgrade(req, { data: { isMCP: true } }) as any;
    }

    // API Routes (match both with and without trailing slash)
    if (
      (path === "/api/parse" || path === "/api/parse/") &&
      req.method === "POST"
    ) {
      return handleParse(req);
    }

    if (
      (path === "/api/evaluate" || path === "/api/evaluate/") &&
      req.method === "POST"
    ) {
      return handleEvaluate(req);
    }

    if (
      (path === "/api/export" || path === "/api/export/") &&
      req.method === "POST"
    ) {
      return handleExport(req);
    }

    // AI Suggestions
    if (path === "/api/ai/suggestions" && req.method === "POST") {
      return handleAiSuggestions(req);
    }

    // MCP API Routes
    // User management
    if (path === "/api/mcp/auth/register" && req.method === "POST") {
      return mcpApi.handleRegisterUser(req);
    }

    if (path === "/api/mcp/auth/login" && req.method === "POST") {
      return mcpApi.handleLoginUser(req);
    }

    if (path === "/api/mcp/auth/me" && req.method === "GET") {
      return mcpApi.handleGetCurrentUser(req);
    }

    // Project management
    if (path.startsWith("/api/mcp/projects") && req.method === "GET") {
      if (path.split("/").length === 4) {
        // /api/mcp/projects/:id
        return mcpApi.handleGetProject(req);
      } else {
        // /api/mcp/projects
        return mcpApi.handleGetProjects(req);
      }
    }

    if (path === "/api/mcp/projects" && req.method === "POST") {
      return mcpApi.handleCreateProject(req);
    }

    // Session management
    if (path.startsWith("/api/mcp/sessions") && req.method === "GET") {
      return mcpApi.handleGetSessions(req);
    }

    if (path === "/api/mcp/sessions" && req.method === "POST") {
      return mcpApi.handleCreateSession(req);
    }

    // System endpoints
    if (path === "/api/mcp/stats" && req.method === "GET") {
      return mcpApi.handleGetStats(req);
    }

    // Health check (match both with and without trailing slash)
    if (path === "/health" || path === "/health/") {
      return new Response(
        JSON.stringify({ status: "ok", wasmLoaded: !!wasmModule }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Default 404
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  },

  websocket: {
    open(ws: any) {
      const connectionId = mcpStore.generateId();

      // Determine if this is MCP or regular connection
      if (ws.data.isMCP) {
        console.log("✓ MCP WebSocket client connected");
        wsManager.addConnection(connectionId, ws, {
          isAuthenticated: false,
          isAnonymous: true,
        });
      } else {
        console.log("✓ WebSocket client connected");
      }

      ws.data.connectionId = connectionId;
    },

    async message(ws: any, message: any) {
      try {
        const data =
          typeof message === "string" ? JSON.parse(message) : message;

        if (ws.data.isMCP) {
          // Handle MCP messages
          if (ws.data.connectionId) {
            await mcpWebSocketServer.handleMessage(data, ws.data.connectionId);
          }
        } else {
          // Handle original API messages
          if (data.type === "evaluate") {
            // Create progress callback to send updates via WebSocket
            const progressCallback = (progress: import("../../shared/types").RenderProgress) => {
              ws.send(JSON.stringify({
                type: "progress_update",
                requestId: data.requestId,
                progress,
                timestamp: Date.now(),
              }));
            };
            
            const result = await handleEvaluateWs(data, ws.data.connectionId, progressCallback);
            ws.send(JSON.stringify(result));
          } else if (data.type === "parse") {
            const result = handleParseWs(data);
            ws.send(JSON.stringify(result));
          }
        }
      } catch (err: any) {
        if (ws.data.isMCP) {
          // MCP error handling
          const errorMessage = {
            id: mcpStore.generateId(),
            type: "error",
            timestamp: new Date(),
            payload: { error: err.message },
          };
          ws.send(JSON.stringify(errorMessage));
        } else {
          // Original API error handling
          ws.send(
            JSON.stringify({
              type: "error",
              error: err.message,
            }),
          );
        }
      }
    },

    close(ws: any) {
      if (ws.data.isMCP) {
        console.log("✓ MCP WebSocket client disconnected");
        if (ws.data.connectionId) {
          wsManager.removeConnection(ws.data.connectionId);
        }
      } else {
        console.log("✓ WebSocket client disconnected");
      }
    },

    error(ws: any, error: any) {
      console.error("WebSocket error:", error);
    },
  } as any, // Cast to any to avoid Bun type mismatches
});

// Initialize MCP store with sample data for testing
mcpStore.initializeSampleData();

// Set up periodic cleanup
setInterval(
  () => {
    mcpStore.cleanupExpired();
    wsManager.cleanupInactive();
  },
  5 * 60 * 1000,
); // Every 5 minutes

console.log(`
╔════════════════════════════════════════════════════════════╗
║         🏗️  moicad CAD Engine Server                       ║
║                                                            ║
║  Server running at: http://localhost:${SERVER_PORT}                ║
║  WebSocket:        ws://localhost:${SERVER_PORT}/ws               ║
║  MCP WebSocket:     ws://localhost:${SERVER_PORT}/ws/mcp           ║
║  Health check:     http://localhost:${SERVER_PORT}/health         ║
║                                                            ║
║  API Endpoints:                                           ║
║    POST /api/parse     - Parse OpenSCAD code             ║
║    POST /api/evaluate  - Parse and evaluate to geometry   ║
║    POST /api/export    - Export geometry to STL/OBJ       ║
║                                                            ║
║  MCP Endpoints:                                          ║
║    POST /api/mcp/auth/register    - User registration     ║
║    POST /api/mcp/auth/login       - User login           ║
║    GET  /api/mcp/auth/me         - Current user         ║
║    GET  /api/mcp/projects        - List projects        ║
║    POST /api/mcp/projects        - Create project       ║
║    GET  /api/mcp/sessions       - List sessions        ║
║    POST /api/mcp/sessions       - Create session        ║
║    GET  /api/mcp/stats          - System statistics     ║
╚════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// Request Handlers
// ============================================================================

async function handleParse(req: Request): Promise<Response> {
  try {
    const { code } = (await req.json()) as { code: string };

    if (!code) {
      return sendJson({ error: "code is required" }, 400);
    }

    const result = parseOpenSCAD(code);

    return sendJson(result);
  } catch (err: any) {
    return sendJson(
      {
        error: err.message,
        success: false,
      },
      500,
    );
  }
}

async function handleEvaluate(req: Request): Promise<Response> {
  try {
    const { code } = (await req.json()) as { code: string };

    if (!code) {
      return sendJson({ error: "code is required" }, 400);
    }

    // Enqueue job (only one evaluation at a time)
    const result = await evaluationQueue.enqueue(code);

    return sendJson(result);
  } catch (err: any) {
    logError("Evaluation request failed", { error: err.message });
    return sendJson(
      {
        geometry: null,
        errors: [{ message: err.message }],
        success: false,
        executionTime: 0,
      },
      500,
    );
  }
}

async function handleExport(req: Request): Promise<Response> {
  // CORS headers for all responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const body = (await req.json()) as {
    geometry: Geometry;
    format: string;
    binary?: boolean;
  };

  try {
    let data: string | ArrayBuffer;
    let contentType: string;

    if (body.format === "stl") {
      data = geometryToSTL(body.geometry, body.binary ?? true);
      contentType = "application/octet-stream";
    } else if (body.format === "obj") {
      data = geometryToOBJ(body.geometry);
      contentType = "text/plain";
    } else {
      throw new Error(`Unsupported export format: ${body.format}`);
    }

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="model.${body.format}"`,
        ...corsHeaders,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

async function handleAiSuggestions(req: Request): Promise<Response> {
  // CORS headers for all responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = (await req.json()) as any;

    // Build suggestion request
    const suggestionRequest = {
      code: body.code || "",
      cursor: body.cursor,
      selection: body.selection,
      context: {
        file: {
          name: body.fileName || "main.scad",
          path: body.filePath || "/main.scad",
          language: "openscad",
        },
        project: body.project,
        session: body.session,
        history: {
          recentSuggestions: [],
          recentChanges: [],
          evaluationErrors: [],
        },
      },
      preferences: {
        types: body.preferences?.types || ["code", "bug_fix", "enhancement"],
        minConfidence: body.preferences?.minConfidence || 0.5,
        maxSuggestions: body.preferences?.maxSuggestions || 5,
        categories: body.preferences?.categories || [],
        autoApply: body.preferences?.autoApply || false,
        requireReview: body.preferences?.requireReview || true,
        excludeExperimental: body.preferences?.excludeExperimental || true,
        customRules: body.preferences?.customRules || [],
      },
      sessionId: body.sessionId,
      userId: body.userId,
    };

    // Generate suggestions
    const response = await aiManager.generateSuggestions(suggestionRequest);

    return new Response(
      JSON.stringify({
        success: true,
        suggestions: response.suggestions,
        metadata: response.metadata,
        provider: response.provider,
        processingTime: response.processingTime,
        requestId: response.requestId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (err: any) {
    console.error("AI suggestions error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
}

// ============================================================================
// WebSocket Handlers
// ============================================================================

function handleParseWs(data: any): any {
  const result = parseOpenSCAD(data.code);
  return {
    type: "parse_response",
    requestId: data.requestId,
    result,
  };
}

async function handleEvaluateWs(
    data: EvaluateMessage,
    connectionId?: string,
    progressCallback?: (progress: import("../../shared/types").RenderProgress) => void
  ): Promise<EvaluateResponse> {
  // Use evaluation queue with progress callback instead of worker pool
  // Worker pool doesn't support progress callbacks yet
  const result = progressCallback 
    ? await evaluationQueue.enqueue(data.code, progressCallback)
    : await workerPool.evaluate(data.code);

  // Ensure the response has the correct requestId matching the request
  const response: EvaluateResponse = {
    type: "evaluate_response",
    requestId: data.requestId,
    geometry: result.geometry,
    errors: result.errors || [],
    executionTime: result.executionTime || 0,
  };

  return response;
}

// ============================================================================
// Utility Functions
// ============================================================================

function sendJson(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * Convert geometry to binary STL format
 */
function geometryToSTL(geometry: any, binary = true): string | ArrayBuffer {
  if (!geometry || !geometry.indices) {
    throw new Error("Invalid geometry");
  }

  const vertices = geometry.vertices;
  const indices = geometry.indices;
  const normals = geometry.normals || computeNormals(vertices, indices);

  if (binary) {
    // Binary STL
    const buffer = new ArrayBuffer(84 + (indices.length / 3) * 50);
    const view = new DataView(buffer);

    // Header
    view.setUint32(80, indices.length / 3, true); // Number of triangles

    let offset = 84;
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      // Normal
      const nx = normals[i0 * 3];
      const ny = normals[i0 * 3 + 1];
      const nz = normals[i0 * 3 + 2];

      view.setFloat32(offset, nx, true);
      offset += 4;
      view.setFloat32(offset, ny, true);
      offset += 4;
      view.setFloat32(offset, nz, true);
      offset += 4;

      // Vertices
      for (const idx of [i0, i1, i2]) {
        view.setFloat32(offset, vertices[idx * 3], true);
        offset += 4;
        view.setFloat32(offset, vertices[idx * 3 + 1], true);
        offset += 4;
        view.setFloat32(offset, vertices[idx * 3 + 2], true);
        offset += 4;
      }

      // Attribute byte count (unused)
      view.setUint16(offset, 0, true);
      offset += 2;
    }

    return buffer;
  } else {
    // ASCII STL
    let stl = "solid model\n";

    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      const nx = normals[i0 * 3];
      const ny = normals[i0 * 3 + 1];
      const nz = normals[i0 * 3 + 2];

      stl += `  facet normal ${nx} ${ny} ${nz}\n`;
      stl += "    outer loop\n";

      for (const idx of [i0, i1, i2]) {
        stl += `      vertex ${vertices[idx * 3]} ${vertices[idx * 3 + 1]} ${vertices[idx * 3 + 2]}\n`;
      }

      stl += "    endloop\n";
      stl += "  endfacet\n";
    }

    stl += "endsolid model\n";
    return stl;
  }
}

/**
 * Convert geometry to OBJ format
 */
function geometryToOBJ(geometry: any): string {
  if (!geometry || !geometry.indices) {
    throw new Error("Invalid geometry");
  }

  const vertices = geometry.vertices;
  const indices = geometry.indices;
  const normals = geometry.normals || computeNormals(vertices, indices);

  let obj = "# moicad exported model\n";
  obj += "mtllib model.mtl\n";
  obj += "usemtl default\n";

  // Vertices
  for (let i = 0; i < vertices.length; i += 3) {
    obj += `v ${vertices[i]} ${vertices[i + 1]} ${vertices[i + 2]}\n`;
  }

  obj += "\n";

  // Normals
  for (let i = 0; i < normals.length; i += 3) {
    obj += `vn ${normals[i]} ${normals[i + 1]} ${normals[i + 2]}\n`;
  }

  obj += "\n";

  // Faces
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] + 1;
    const i1 = indices[i + 1] + 1;
    const i2 = indices[i + 2] + 1;
    obj += `f ${i0}//${i0} ${i1}//${i1} ${i2}//${i2}\n`;
  }

  return obj;
}

/**
 * Compute normals from vertices and indices
 */
function computeNormals(
  vertices: Float32Array,
  indices: Uint32Array,
): Float32Array {
  const normals = new Float32Array(vertices.length);

  // Accumulate face normals
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];

    const v0 = [vertices[i0 * 3], vertices[i0 * 3 + 1], vertices[i0 * 3 + 2]];
    const v1 = [vertices[i1 * 3], vertices[i1 * 3 + 1], vertices[i1 * 3 + 2]];
    const v2 = [vertices[i2 * 3], vertices[i2 * 3 + 1], vertices[i2 * 3 + 2]];

    const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

    const normal = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ];

    const len = Math.sqrt(
      normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2],
    );
    if (len > 0) {
      normal[0] /= len;
      normal[1] /= len;
      normal[2] /= len;
    }

    normals[i0 * 3] += normal[0];
    normals[i0 * 3 + 1] += normal[1];
    normals[i0 * 3 + 2] += normal[2];

    normals[i1 * 3] += normal[0];
    normals[i1 * 3 + 1] += normal[1];
    normals[i1 * 3 + 2] += normal[2];

    normals[i2 * 3] += normal[0];
    normals[i2 * 3 + 1] += normal[1];
    normals[i2 * 3 + 2] += normal[2];
  }

  // Normalize accumulated normals
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.sqrt(
      normals[i] * normals[i] +
        normals[i + 1] * normals[i + 1] +
        normals[i + 2] * normals[i + 2],
    );
    if (len > 0) {
      normals[i] /= len;
      normals[i + 1] /= len;
      normals[i + 2] /= len;
    }
  }

  return normals;
}
