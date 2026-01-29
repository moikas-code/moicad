import { spawn } from 'bun';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { getGuiPath, isDevMode } from '../utils/paths';
import { logger } from '../utils/logger';
import { createServer } from '../server';

interface LaunchOptions {
  filePath?: string;
  devMode: boolean;
  port?: string;
  open?: boolean;
}

export async function launch(options: LaunchOptions) {
  const port = parseInt(options.port || '42069', 10);
  const shouldOpen = options.open !== undefined ? options.open : true;

  // Validate file path if provided
  let resolvedFilePath: string | undefined;
  if (options.filePath) {
    resolvedFilePath = resolve(process.cwd(), options.filePath);
    if (!existsSync(resolvedFilePath)) {
      logger.error(`File not found: ${options.filePath}`);
      process.exit(1);
    }
    logger.info(`Opening file: ${options.filePath}`);
  }

  // Detect mode: dev flag OR running in monorepo
  const autoDetectedDevMode = isDevMode();
  const useDevMode = options.devMode || autoDetectedDevMode;

  logger.info('Starting moicad...');

  if (useDevMode) {
    // Development mode: Start Next.js dev server for GUI + our API server
    logger.info('Development mode enabled (hot reload active)');
    await launchDevMode(port, resolvedFilePath, shouldOpen);
  } else {
    // Production mode: Use our Bun server
    logger.info('Production mode');
    await launchProductionMode(port, resolvedFilePath, shouldOpen);
  }
}

/**
 * Development mode: Run Next.js dev server for GUI with hot reload
 * API requests are handled by our Bun server
 */
async function launchDevMode(port: number, filePath?: string, shouldOpen: boolean = true) {
  const guiPath = getGuiPath();

  if (!guiPath) {
    logger.error('GUI package not found. Are you in the moicad monorepo?');
    process.exit(1);
  }

  logger.info(`GUI path: ${guiPath}`);
  logger.info(`Web UI: http://localhost:3000`);
  logger.info(`API Server: http://localhost:${port}`);

  // Start the API server on port 42069
  createServer({ port, dev: true });

  // Start Next.js dev server on port 3000
  const env = {
    ...process.env,
    PORT: '3000',
    NODE_ENV: 'development',
    NEXT_PUBLIC_API_URL: `http://localhost:${port}`,
    MOICAD_FILE: filePath || '',
  };

  const proc = spawn(['bun', 'run', 'dev'], {
    cwd: guiPath,
    env,
    stdio: ['inherit', 'inherit', 'inherit'],
  });

  if (shouldOpen) {
    setTimeout(async () => {
      try {
        const open = await import('open');
        const url = filePath
          ? `http://localhost:3000?file=${encodeURIComponent(filePath)}`
          : 'http://localhost:3000';
        await open.default(url);
        logger.success('Opened in browser');
      } catch (error) {
        logger.warn('Could not auto-open browser. Please open manually.');
      }
    }, 3000);
  }

  await proc.exited;
}

/**
 * Production mode: Use our Bun server to serve GUI and handle API
 */
async function launchProductionMode(port: number, filePath?: string, shouldOpen: boolean = true) {
  const guiPath = getGuiPath();

  logger.info(`Web UI: http://localhost:${port}`);

  // Start the server
  createServer({
    port,
    dev: false,
    staticDir: guiPath ? `${guiPath}/.next` : undefined,
  });

  if (shouldOpen) {
    setTimeout(async () => {
      try {
        const open = await import('open');
        const url = filePath
          ? `http://localhost:${port}?file=${encodeURIComponent(filePath)}`
          : `http://localhost:${port}`;
        await open.default(url);
        logger.success('Opened in browser');
      } catch (error) {
        logger.warn('Could not auto-open browser. Please open manually.');
      }
    }, 1000);
  }

  // Keep the process running
  await new Promise(() => {});
}
