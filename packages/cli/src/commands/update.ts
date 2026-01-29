import { spawn } from 'bun';
import { logger } from '../utils/logger';
import { getMonorepoRoot } from '../utils/paths';

export async function update() {
  logger.info('🔄 Updating moicad...');

  const root = getMonorepoRoot();

  // Pull latest changes
  logger.info('📥 Pulling latest changes...');
  const gitProc = spawn(['git', 'pull'], {
    cwd: `${root}/moicad`,
    stdio: ['inherit', 'inherit', 'inherit']
  });

  await gitProc.exited;

  if (gitProc.exitCode !== 0) {
    logger.error('Failed to pull latest changes');
    process.exit(1);
  }

  // Install dependencies
  logger.info('📦 Installing dependencies...');
  const installProc = spawn(['bun', 'install'], {
    cwd: `${root}/moicad`,
    stdio: ['inherit', 'inherit', 'inherit']
  });

  await installProc.exited;

  if (installProc.exitCode !== 0) {
    logger.error('Failed to install dependencies');
    process.exit(1);
  }

  // Build SDK
  logger.info('🔨 Building SDK...');
  const sdkProc = spawn(['bun', 'run', 'build'], {
    cwd: `${root}/moicad/packages/sdk`,
    stdio: ['inherit', 'inherit', 'inherit']
  });

  await sdkProc.exited;

  if (sdkProc.exitCode !== 0) {
    logger.error('Failed to build SDK');
    process.exit(1);
  }

  // Build CLI
  logger.info('🔨 Building CLI...');
  const cliProc = spawn(['bun', 'run', 'build'], {
    cwd: `${root}/moicad/packages/cli`,
    stdio: ['inherit', 'inherit', 'inherit']
  });

  await cliProc.exited;

  if (cliProc.exitCode !== 0) {
    logger.error('Failed to build CLI');
    process.exit(1);
  }

  logger.success('✅ moicad updated successfully!');
  logger.info('Run "moicad --version" to see the new version');
}
