// Simple logger without external dependencies
export const logger = {
  info: (msg: string) => console.log('ℹ', msg),
  success: (msg: string) => console.log('✓', msg),
  error: (msg: string) => console.error('✗', msg),
  warn: (msg: string) => console.warn('⚠', msg)
};
