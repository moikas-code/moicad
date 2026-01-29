import { spawn } from 'bun';
import { resolve } from 'path';
import { logger } from '../utils/logger';

export async function install() {
  logger.info('📦 Installing @moicad/gui for standalone use...');

  try {
    // Install @moicad/gui globally
    const proc = spawn(['bun', 'add', '-g', '@moicad/gui'], {
      stdio: ['inherit', 'inherit', 'inherit']
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      logger.success('✅ @moicad/gui installed successfully!');
      logger.info('🚀 You can now use moicad standalone without the development repo.');
    } else {
      logger.error('❌ Failed to install @moicad/gui');
      process.exit(1);
    }
  } catch (error) {
    logger.error(`❌ Installation failed: ${error}`);
    process.exit(1);
  }
}
