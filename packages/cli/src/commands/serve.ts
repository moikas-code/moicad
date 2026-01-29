/**
 * Serve command - Start the moicad server without opening browser
 */

import { createServer } from '../server';
import { getGuiPath, isDevMode } from '../utils/paths';
import { logger } from '../utils/logger';

interface ServeOptions {
  port?: string;
  dev?: boolean;
}

export async function serve(options: ServeOptions) {
  const port = parseInt(options.port || '42069', 10);
  const isDev = options.dev ?? isDevMode();

  logger.info('Starting moicad server...');
  logger.info(`Mode: ${isDev ? 'development' : 'production'}`);
  logger.info(`URL: http://localhost:${port}`);

  const guiPath = getGuiPath();

  if (!guiPath && !isDev) {
    logger.warn('GUI package not found. API-only mode.');
  }

  // Start the server
  createServer({
    port,
    dev: isDev,
    staticDir: guiPath ? `${guiPath}/.next` : undefined,
  });

  // Keep the process running
  await new Promise(() => {});
}
