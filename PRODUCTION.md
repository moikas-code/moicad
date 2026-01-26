# moicad Production Deployment Guide

This guide covers production deployment best practices for the moicad backend server.

## Environment Variables

### Required for Production

```bash
# Environment
NODE_ENV=production

# CORS Security
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# OpenSCAD Library Path
OPENSCADPATH=/usr/share/openscad/libraries:/usr/local/share/openscad/libraries
```

### Optional

```bash
# Logging
LOG_LEVEL=info|warn|error

# Rate Limiting (can be set via config file too)
RATE_LIMIT_GENERAL=100
RATE_LIMIT_STRICT=10
```

## Quick Start

### Option 1: Direct Execution

```bash
# 1. Set environment variables
export NODE_ENV=production
export ALLOWED_ORIGINS="https://yourdomain.com"

# 2. Install dependencies
bun install --frozen-lockfile --production

# 3. Start server
bun backend/index.ts
```

### Option 2: Production Script

```bash
# Use the provided production startup script
./start-production.sh
```

### Option 3: Docker

```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.production.yml up -d

# Or build and run manually
docker build -f Dockerfile.production -t moicad-backend .
docker run -p 3000:3000 --env-file .env moicad-backend
```

## Security Configuration

### Rate Limiting

- **General endpoints**: 100 requests per 15 minutes per IP
- **Expensive endpoints** (`/api/evaluate`): 10 requests per 1 minute per IP
- **IPv6 subnet grouping**: Prevents abuse across IPv6 address ranges
- **Bypass**: Health checks and static files are excluded

### Security Headers

- **CSP**: Restricts script sources to same origin
- **HSTS**: HTTP Strict Transport Security (production only)
- **CORS**: Configurable origin allowlist in production
- **Request size limits**: 10MB maximum request body

### Input Validation

- File import sandboxing with path traversal protection
- File extension restrictions (`.scad`, `.csg` only)
- File size limits (1MB maximum)
- Dangerous path filtering (`..`, `~`, absolute paths)

## Monitoring & Health Checks

### Health Endpoints

| Endpoint | Purpose | Status Codes |
|----------|---------|--------------|
| `/health` | Application health | 200/503 |
| `/metrics` | Performance metrics | 200/500 |
| `/ready` | Readiness probe | 200/503 |
| `/live` | Liveness probe | 200 |

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-25T10:30:00.000Z",
  "environment": "production",
  "version": "1.0.0",
  "uptime": 3600.5,
  "memory": {
    "used": 245,
    "total": 512,
    "external": 45
  },
  "api": {
    "parser": "operational",
    "evaluator": "operational", 
    "wasm": "loaded"
  },
  "production": {
    "logFilesAccessible": true,
    "diskSpace": "adequate"
  }
}
```

## Logging

### Log Levels

- **Development**: `debug`, `info`, `warn`, `error`
- **Production**: `info`, `warn`, `error`
- **Test**: `error` only

### Log Files

```
logs/
├── combined.log      # All logs in JSON format
├── error.log        # Error-level logs only
├── exceptions.log   # Uncaught exceptions
└── rejections.log    # Unhandled promise rejections
```

### Log Format

```json
{
  "level": "info",
  "message": "Request processed successfully",
  "timestamp": "2024-01-25T10:30:00.000Z",
  "service": "moicad-backend"
}
```

## Performance Optimization

### Caching

- **Primitive cache**: LRU cache for frequently used geometries (100 items)
- **Expression memoization**: Caches expression evaluation results
- **WASM optimization**: Pre-compiled for production

### Resource Limits

- **Memory**: Monitor heap usage, implement alerts at 80% capacity
- **CPU**: Set process priority, implement CPU usage monitoring
- **Request timeout**: 30s for evaluation, 10s for other endpoints

## Error Handling

### Production Error Recovery

1. **Uncaught Exceptions**: Logged to `logs/exceptions.log`, process continues
2. **Unhandled Rejections**: Logged to `logs/rejections.log`, process continues  
3. **WASM Failures**: Graceful degradation with limited functionality
4. **Import Errors**: Detailed error messages without exposing system paths

### Error Response Format

```json
{
  "error": "Request timeout",
  "message": "Request timed out after 30000ms", 
  "requestId": "uuid-string",
  "timestamp": "2024-01-25T10:30:00.000Z"
}
```

## Container Deployment

### Docker Compose

```yaml
# docker-compose.production.yml
version: '3.8'
services:
  moicad-backend:
    build:
      context: .
      dockerfile: Dockerfile.production
    environment:
      - NODE_ENV=production
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

### Kubernetes Considerations

- **Readiness probe**: Use `/ready` endpoint
- **Liveness probe**: Use `/live` endpoint  
- **Resource requests**: 512Mi memory, 0.5 CPU
- **Resource limits**: 1Gi memory, 1.0 CPU
- **Security context**: Non-root user, read-only filesystem where possible

## Deployment Checklist

### Pre-deployment

- [ ] Environment variables configured
- [ ] `ALLOWED_ORIGINS` set to production domains
- [ ] Log directories created with proper permissions
- [ ] SSL/TLS certificates (if terminating at application)
- [ ] OpenSCAD library paths configured
- [ ] Rate limits reviewed for expected load

### Post-deployment

- [ ] Health check returning 200
- [ ] Metrics endpoint accessible
- [ ] Log files being created
- [ ] Rate limiting working (test with burst traffic)
- [ ] CORS headers correct for frontend domain
- [ ] Memory usage stable under load
- [ ] Error monitoring alerts configured

## Monitoring Integration

### Prometheus Metrics

Collect metrics from `/metrics` endpoint:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'moicad'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Alerting Rules

- **Memory usage > 80%**: Critical alert
- **Error rate > 5%**: Warning alert
- **Response time > 5s**: Warning alert  
- **Health check failures**: Critical alert

## Scaling Considerations

### Horizontal Scaling

- **Stateless**: Current implementation is stateless (except file imports)
- **Load balancer**: Configure health checks on `/health`
- **Session affinity**: Not required (no user sessions)
- **Shared storage**: Required for file import caching at scale

### Performance Optimization

- **Connection pooling**: Consider for database connections (if added)
- **CDN**: Static file serving via CDN
- **Compression**: Enable gzip/brotli for API responses
- **Caching**: Add Redis/Memcached for geometry cache at scale

## Troubleshooting

### Common Issues

**WASM Module Not Loading**
```bash
# Check if WASM files exist
ls -la wasm/pkg/

# Check browser console for WASM errors
# Check logs for WASM initialization errors
```

**High Memory Usage**
```bash
# Monitor with Node.js process monitoring
node --inspect=0.0.0.0 backend/index.ts

# Check memory in logs
grep "heapUsed" logs/combined.log
```

**Rate Limiting Issues**
```bash
# Test rate limits
curl -v http://localhost:3000/api/evaluate
# Check RateLimit headers in response
```

**CORS Issues**
```bash
# Test CORS preflight
curl -v -X OPTIONS http://localhost:3000/api/parse \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: POST"
```

## Security Best Practices

1. **Keep dependencies updated**: `bun audit` and update regularly
2. **Use HTTPS**: Terminate SSL at load balancer or application
3. **Environment variable security**: Use secrets management for sensitive data
4. **Regular security scans**: Check dependencies for vulnerabilities
5. **Input validation**: Already implemented but review regularly
6. **Access logging**: All requests logged in production
7. **Error information disclosure**: Minimal error details in production responses

## Support

For production issues:
1. Check health endpoint status
2. Review error logs in `logs/error.log`
3. Monitor metrics endpoint performance data
4. Verify environment variables are correct
5. Test with production-like load conditions