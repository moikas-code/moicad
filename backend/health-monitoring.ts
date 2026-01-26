import logger, { logInfo, logError } from './logger';

// Health check endpoint handler
export function healthCheck(): Response {
  try {
    // Basic health indicators
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
        external: Math.round(process.memoryUsage().external / 1024 / 1024), // MB
      },
      api: {
        parser: 'operational',
        evaluator: 'operational',
        wasm: (globalThis as any).globals?.wasmModule ? 'loaded' : 'not loaded',
      }
    };

    // Add production-specific health checks
    if (process.env.NODE_ENV === 'production') {
      (health as any).production = {
        logFilesAccessible: true, // TODO: check actual log file access
        diskSpace: 'adequate', // TODO: check actual disk space
      };
    }

    return new Response(JSON.stringify(health), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    logError('Health check failed', { error: error instanceof Error ? error.message : String(error) });
    
    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Metrics endpoint for monitoring
export function metrics(): Response {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      nodeEnv: process.env.NODE_ENV || 'development'
    };

    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    logError('Metrics collection failed', { error: error instanceof Error ? error.message : String(error) });
    
    return new Response(JSON.stringify({
      error: 'Metrics collection failed',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Readiness probe (for container orchestration)
export function readinessProbe(): Response {
  const isReady = (globalThis as any).globals?.wasmModule !== null;
  
  if (isReady) {
    return new Response(JSON.stringify({
      status: 'ready',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    return new Response(JSON.stringify({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: 'WASM module not loaded'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Liveness probe (for container orchestration)
export function livenessProbe(): Response {
  // Simple liveness check - just respond if process is running
  return new Response(JSON.stringify({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}