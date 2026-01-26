import helmet from 'helmet';
import cors from 'cors';

// Production security configuration
export const securityMiddleware = [
  // Helmet.js for security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: process.env.NODE_ENV === 'production' ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    } : false,
  }),
  
  // CORS configuration
  cors({
    origin: process.env.NODE_ENV === 'production' 
      ? (origin, callback) => {
        // In production, specify allowed origins
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
      : true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  }),
];

// Request timeout middleware
export const requestTimeout = () => {
  return (req: any, res: any, next: any) => {
    // Set timeout based on operation type
    const timeout = req.url?.includes('/evaluate') ? 30000 : 10000; // 30s for evaluation, 10s for others
    
    req.setTimeout(timeout, () => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: `Request timed out after ${timeout}ms`,
          requestId: req.requestId
        });
      }
    });
    
    next();
  };
};

// Request size limits
export const requestSizeLimit = () => {
  return (req: any, res: any, next: any) => {
    const contentLength = req.headers['content-length'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return res.status(413).json({
        error: 'Request too large',
        message: 'Request body exceeds maximum size limit of 10MB',
        maxSize: maxSize
      });
    }
    
    next();
  };
};