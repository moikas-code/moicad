import { spawn } from 'bun';
import { getMonorepoRoot } from '../utils/paths';
import { logger } from '../utils/logger';

export async function serve(options: any) {
  const root = getMonorepoRoot();
  const port = options.port || 3000;

  logger.info('🌐 Starting production server...');
  logger.info(`📂 Root: ${root}`);
  logger.info(`🌐 URL: http://localhost:${port}`);

  const env = {
    ...process.env,
    PORT: port.toString()
  };

  const proc = spawn(['bun', 'run', 'start'], {
    cwd: `${root}/moicad/packages/app`,
    env,
    stdio: ['inherit', 'inherit', 'inherit']
  });

  await proc.exited;
}
