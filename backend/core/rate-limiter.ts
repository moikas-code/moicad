import { rateLimit } from 'express-rate-limit';

// Production rate limiting configuration
export const createRateLimiter = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: isProduction ? 100 : 1000, // More restrictive in production
    standardHeaders: 'draft-8', // Use modern RateLimit headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    ipv6Subnet: 56, // Group IPv6 addresses
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    // Skip rate limiting for health checks and static files
    skip: (req) => {
      return req.url === '/health' || req.url?.startsWith('/static/');
    }
  });
};

// Stricter rate limiter for expensive endpoints
export const createStrictRateLimiter = () => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: process.env.NODE_ENV === 'production' ? 10 : 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'Rate limit exceeded for expensive operations',
      retryAfter: '1 minute'
    }
  });
};