import { spawn } from 'bun';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { getAppPath, isDevMode } from '../utils/paths';
import { logger } from '../utils/logger';
interface LaunchOptions {
  filePath?: string;
  devMode: boolean;
  port?: string;
  open?: boolean;
}

export async function launch(options: LaunchOptions) {
  const port = options.port || '42069';
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

  // Detect mode: dev flag OR running in monorepo
  const autoDetectedDevMode = isDevMode();
  const useDevMode = options.devMode || autoDetectedDevMode;

  logger.info('🚀 Starting moicad...');
  if (useDevMode) {
    logger.info('🔧 Development mode enabled (hot reload active)');
  }
  logger.info(`🌐 Web UI: http://localhost:${port}`);

  // Get app path (auto-detects bundled vs monorepo)
  const appPath = getAppPath();

  const env = {
    ...process.env,
    PORT: port,
    NODE_ENV: useDevMode ? 'development' : 'production',
    MOICAD_FILE: resolvedFilePath || ''
  };

  // Use 'dev' in dev mode (hot reload), 'start' in production (built app)
  const command = useDevMode ? 'dev' : 'start';

  const proc = spawn(['bun', 'run', command], {
    cwd: appPath,
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
    }, useDevMode ? 3000 : 2000); // Dev mode takes longer
  }

  await proc.exited;
}
