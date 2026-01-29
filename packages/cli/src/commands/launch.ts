import { spawn } from 'bun';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { getMonorepoRoot } from '../utils/paths';
import { logger } from '../utils/logger';

interface LaunchOptions {
  filePath?: string;
  devMode: boolean;
  port?: string;
  open?: boolean;
}

export async function launch(options: LaunchOptions) {
  const root = getMonorepoRoot();
  const port = options.port || '3000';
  const shouldOpen = options.open !== undefined ? options.open : true; // Auto-open by default

  // Validate file path if provided
  let resolvedFilePath: string | undefined;
  if (options.filePath) {
    resolvedFilePath = resolve(process.cwd(), options.filePath);
    if (!existsSync(resolvedFilePath)) {
      logger.error(`File not found: ${options.filePath}`);
      process.exit(1);
    }
    logger.info(`📄 Opening file: ${options.filePath}`);
  }

  logger.info('🚀 Starting moicad...');
  if (options.devMode) {
    logger.info('🔧 Development mode enabled (hot reload active)');
  }
  logger.info(`🌐 Web UI: http://localhost:${port}`);

  const env = {
    ...process.env,
    PORT: port,
    NODE_ENV: options.devMode ? 'development' : 'production',
    MOICAD_FILE: resolvedFilePath || ''
  };

  // Always use dev mode for now (until we have a proper build system)
  // TODO: Check if .next/BUILD_ID exists, if so use 'start', otherwise use 'dev'
  const command = 'dev';

  const proc = spawn(['bun', 'run', command], {
    cwd: `${root}/moicad/packages/app`,
    env,
    stdio: ['inherit', 'inherit', 'inherit']
  });

  if (shouldOpen) {
    // Wait for server to start, then open browser
    setTimeout(async () => {
      try {
        const open = await import('open');
        const url = resolvedFilePath
          ? `http://localhost:${port}?file=${encodeURIComponent(resolvedFilePath)}`
          : `http://localhost:${port}`;
        await open.default(url);
        logger.success('✨ Opened in browser');
      } catch (error) {
        logger.warn('Could not auto-open browser. Please open manually.');
      }
    }, options.devMode ? 3000 : 2000); // Dev mode takes longer
  }

  await proc.exited;
}
