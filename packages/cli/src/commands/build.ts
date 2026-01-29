import { spawn } from 'bun';
import { getMonorepoRoot } from '../utils/paths';
import { logger } from '../utils/logger';

export async function build(options: any) {
  const root = getMonorepoRoot();

  logger.info('📦 Building moicad...');
  logger.info('Building SDK...');

  const sdkProc = spawn(['bun', 'run', 'build'], {
    cwd: `${root}/moicad/packages/sdk`,
    stdio: ['inherit', 'inherit', 'inherit']
  });

  await sdkProc.exited;

  if (sdkProc.exitCode !== 0) {
    logger.error('SDK build failed');
    process.exit(1);
  }

  logger.success('SDK built successfully');
  logger.info('Building app...');

  const appProc = spawn(['bun', 'run', 'build'], {
    cwd: `${root}/moicad/packages/app`,
    stdio: ['inherit', 'inherit', 'inherit']
  });

  await appProc.exited;

  if (appProc.exitCode !== 0) {
    logger.error('App build failed');
    process.exit(1);
  }

  logger.success('App built successfully');
  logger.success('✅ All packages built successfully!');
}
