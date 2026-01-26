export interface ProductionConfig {
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
  readonly rateLimits: {
    general: { windowMs: number; limit: number };
    strict: { windowMs: number; limit: number };
  };
  readonly timeouts: {
    evaluation: number;
    general: number;
  };
  readonly maxRequestSize: number;
  readonly logLevel: 'error' | 'warn' | 'info' | 'debug';
  readonly cors: {
    allowedOrigins: string[];
    credentials: boolean;
  };
}

export const config: ProductionConfig = {
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },
  
  get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  },
  
  get isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  },
  
  get rateLimits() {
    const isProd = this.isProduction;
    return {
      general: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: isProd ? 100 : 1000
      },
      strict: {
        windowMs: 60 * 1000, // 1 minute
        limit: isProd ? 10 : 100
      }
    };
  },
  
  get timeouts() {
    return {
      evaluation: this.isProduction ? 30000 : 60000, // 30s prod, 60s dev
      general: this.isProduction ? 10000 : 30000 // 10s prod, 30s dev
    };
  },
  
  get maxRequestSize(): number {
    return 10 * 1024 * 1024; // 10MB
  },
  
  get logLevel(): 'error' | 'warn' | 'info' | 'debug' {
    if (this.isProduction) return 'info';
    if (this.isTest) return 'error';
    return 'debug';
  },
  
  get cors() {
    return {
      allowedOrigins: this.isProduction 
        ? (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(o => o)
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    };
  }
};

// Environment validation
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (config.isProduction) {
    if (!process.env.ALLOWED_ORIGINS) {
      errors.push('ALLOWED_ORIGINS environment variable required in production');
    }
    
    if (!process.env.OPENSCADPATH) {
      console.warn('OPENSCADPATH not set, using default library paths');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}