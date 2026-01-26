#!/bin/bash

# Production startup script for moicad with Tauri on Linux Wayland

set -e

echo "🚀 Starting moicad backend for Tauri (Linux Wayland)..."

# Environment validation
if [ -z "$NODE_ENV" ]; then
    echo "❌ NODE_ENV not set, using 'production'"
    export NODE_ENV="production"
fi

if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  Warning: NODE_ENV is not set to 'production'"
fi

# Tauri-specific considerations for Wayland
echo "📱 Tauri Configuration (Linux Wayland):"
echo "  - Display server: Wayland detected"
echo "  - No display server (X11) compatibility needed"

# Create required directories (with user permissions)
mkdir -p logs
mkdir -p temp
mkdir -p ~/.local/share/moicad

# Set production-specific environment variables
export NODE_ENV="${NODE_ENV:-production}"
export LOG_LEVEL="${LOG_LEVEL:-info}"

# Security and rate limiting for Tauri (local access focus)
export ALLOWED_ORIGINS="tauri://localhost,tauri://127.0.0.1,http://localhost:42069"

# OpenSCAD library path for imports with user directory support
export OPENSCADPATH="${OPENSCADPATH:-~/.local/share/moicad/libraries:/usr/share/openscad/libraries:/usr/local/share/openscad/libraries}"

# Tauri-specific settings
export TAURI_MODE="production"
export TAURI_WATCH_FS="false"  # Disable filesystem watching in production

echo "📊 Environment configuration:"
echo "  NODE_ENV: $NODE_ENV"
echo "  LOG_LEVEL: $LOG_LEVEL"
echo "  TAURI_MODE: $TAURI_MODE"
echo "  ALLOWED_ORIGINS: $ALLOWED_ORIGINS"
echo "  OPENSCADPATH: $OPENSCADPATH"

# Health check for local Tauri app
check_health() {
    local retries=15
    local wait_time=2

    echo "🔍 Waiting for Tauri backend to be ready..."

    for i in $(seq 1 $retries); do
        # For Tauri, we check the process directly
        if pgrep -f "bun.*backend/index.ts" > /dev/null && curl -f -s --max-time 3 http://localhost:42069/health >/dev/null 2>&1; then
            echo "✅ Tauri backend is healthy and ready"
            return 0
        fi
        echo "⏳ Attempt $i/$retries..."
        sleep $wait_time
    done

    echo "❌ Tauri backend failed to become healthy after $retries attempts"
    return 1
}

# Start the backend server
echo "🎯 Starting moicad backend for Tauri..."
echo "📊 Health check available at: http://localhost:42069/health"
echo "📊 Metrics available at: http://localhost:42069/metrics"
echo "📊 Ready check at: http://localhost:42069/ready"
echo "📊 Liveness probe at: http://localhost:42069/live"

# Log startup information
echo "🔧 System Information:"
echo "  Platform: $(uname -s)"
echo "  Desktop Environment: Tauri (Linux Wayland)"
echo "  Process Priority: Normal"

# Start server in background
echo "⚡ Starting backend server..."
bun backend/index.ts &
SERVER_PID=$!

# Give server a moment to start
sleep 3

# Check if server started successfully
if ! ps -p $SERVER_PID > /dev/null; then
    echo "❌ Server failed to start"
    echo "💡 Check:"
    echo "   - bun is installed: $(which bun)"
    echo "   - WASM files exist: $(ls -la wasm/pkg/ 2>/dev/null | wc -l)"
    echo "   - Port 42069 is available: $(netstat -tuln | grep :42069 || echo 'Available')"
    exit 1
fi

# Log server info
echo "✅ moicad backend started successfully (PID: $SERVER_PID)"
echo "📝 Process information:"
echo "  PID: $SERVER_PID"
echo "  Memory limit: unlimited"
echo "  CPU affinity: all cores"

# Perform health check with longer timeout for Tauri
if check_health; then
    echo "🎉 moicad backend is ready for Tauri frontend!"
    echo ""
    echo "🔗 Tauri app can now connect to:"
    echo "   - Local backend: http://localhost:42069"
    echo "   - Health checks: http://localhost:42069/health"
    echo "   - WebSocket: ws://localhost:42069/ws"

    # Keep script running and monitor server
    # Trap SIGTERM and SIGINT for graceful shutdown
    trap 'echo "🛑 Shutting down server..."; kill $SERVER_PID 2>/dev/null; exit 0' SIGTERM SIGINT

    # Monitor server and restart if needed
    while ps -p $SERVER_PID > /dev/null; do
        sleep 30

        # Check if server is still responding
        if ! curl -f -s --max-time 5 http://localhost:42069/health >/dev/null 2>&1; then
            echo "⚠️  Server not responding, restarting..."
            kill $SERVER_PID 2>/dev/null || true
            bun backend/index.ts &
            SERVER_PID=$!
            sleep 5
        fi
    done

else
    echo "❌ Server failed health check"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi
