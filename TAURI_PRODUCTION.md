# moicad Production Deployment - Tauri Linux Wayland

🎯 **Quick Start for Your Setup**
```bash
# 1. Set environment for production
export NODE_ENV=production
export ALLOWED_ORIGINS="tauri://localhost,tauri://127.0.0.1"

# 2. Create user library directory
mkdir -p ~/.local/share/moicad/libraries

# 3. Start backend
bun backend/index.ts
```

## 🔧 Environment Configuration

### Required Variables
```bash
NODE_ENV=production                          # Production mode
OPENSCADPATH=~/.local/share/moicad/libraries:/usr/share/openscad/libraries  # Library path
```

### Security (Tauri-specific)
```bash
ALLOWED_ORIGINS="tauri://localhost,tauri://127.0.0.1"  # Only Tauri origins needed
```

## 🏗️ Build & Run

### For Development with Production Backend
```bash
# Terminal 1: Backend
export NODE_ENV=production
export ALLOWED_ORIGINS="tauri://localhost,tauri://127.0.0.1"  
bun backend/index.ts

# Terminal 2: Frontend
npm run tauri dev
```

### For Production Build
```bash
# Build Tauri app
npm run tauri build

# Run production app
./dist/moicad
```

## 📊 Monitoring

### Health Check (from Tauri app)
```javascript
// In your Tauri frontend
const healthResponse = await fetch('tauri://localhost/api/health');
const health = await healthResponse.json();
console.log('Backend health:', health.status);
```

### Performance Metrics
```javascript
// Available at tauri://localhost/metrics
const metrics = await fetch('tauri://localhost/metrics');
console.log('System performance:', await metrics.json());
```

## 🚨 Tauri-Specific Issues

### ✅ Fixed in This Setup
- **No Docker overhead** - Direct process execution
- **Wayland compatibility** - No X11 dependencies
- **Efficient IPC** - Tauri's local communication
- **File access** - Through Tauri's secure API

### 🔧 Backend Access Pattern

```javascript
// Frontend API calls
import { invoke } from '@tauri-apps/api/core';

// Instead of fetch('http://localhost:42069/api/...')
const result = await invoke('evaluate_openscad', { 
  code: openscadCode 
});
```

### 📁 Tauri Configuration (tauri.conf.json)

The key sections that matter for your setup:

```json
{
  "tauri": {
    "allowlist": {
      "all": false,
      "http": {
        "all": true, 
        "request": true,
        "scope": ["http://localhost:42069/*"]
      }
    }
  }
}
```

## 🎯 Production Checklist

### Backend
- [ ] `NODE_ENV=production` set
- [ ] Winson logging configured (JSON format)
- [ ] Rate limiting active
- [ ] Health endpoints responding
- [ ] OpenSCAD library path configured
- [ ] Memory usage monitored

### Tauri Frontend  
- [ ] `tauri://localhost` in allowlist
- [ ] Production build tested
- [ ] File operations use Tauri API
- [ ] No hardcoded `http://localhost` URLs
- [ ] Error handling for IPC failures

### Security
- [ ] Only Tauri origins allowed
- [ ] No global state exposure
- [ ] Input validation on all API calls
- [ ] Proper CSP headers

## 🔍 Debugging Tauri Issues

### Backend Health
```bash
# Check if backend is accessible from Tauri context
curl -v http://localhost:42069/health
```

### Tauri IPC
```javascript
// Check if Tauri commands are available
import { invoke } from '@tauri-apps/api/core';

try {
  await invoke('get_backend_health');
  console.log('Tauri IPC working');
} catch (error) {
  console.error('Tauri IPC failed:', error);
}
```

### Wayland Specifics
```bash
# Check your environment
echo $XDG_SESSION_TYPE  # Should be 'wayland'
echo $WAYLAND_DISPLAY  # Wayland display info

# Force XWayland if needed (not recommended)
export GDK_BACKEND=x11
```

## 📈 Performance Tips for Linux Wayland

### Memory Management
```javascript
// Monitor WASM memory usage
const checkMemory = () => {
  const mem = process.memoryUsage();
  if (mem.heapUsed > 800 * 1024 * 1024) { // 800MB
    console.warn('High memory usage:', mem);
    // Suggest garbage collection or cleanup
  }
};

setInterval(checkMemory, 30000); // Every 30 seconds
```

### Process Priority
```bash
# Set optimal priority for CAD application
nice -n 5 bun backend/index.ts  # Lower priority (good for interactive apps)
```

## 🚀 Quick Commands

### Start Everything (Development)
```bash
# Terminal 1 - Backend
NODE_ENV=production ALLOWED_ORIGINS="tauri://localhost,tauri://127.0.0.1" \
OPENSCADPATH=~/.local/share/moicad/libraries \
bun backend/index.ts &

# Terminal 2 - Frontend  
npm run tauri dev
```

### Production Build
```bash
# Build for production
npm run tauri build

# The built app will be in ./dist/
# Contains everything needed for distribution
```

This setup is optimized for your Tauri on Linux Wayland environment - no Docker, no unnecessary complexity, just efficient local execution.
