#!/bin/bash

# OSdag Web Services Stop Script

echo "🛑 Stopping OSdag Web Services"
echo "================================"

# Function to stop service
stop_service() {
    local name=$1
    local pid_file="${name}.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            echo "🔄 Stopping $name (PID: $pid)..."
            kill $pid
            sleep 2
            if kill -0 $pid 2>/dev/null; then
                echo "⚠️  Force killing $name..."
                kill -9 $pid
            fi
            echo "✅ $name stopped"
        else
            echo "ℹ️  $name was not running"
        fi
        rm -f "$pid_file"
    else
        echo "ℹ️  No PID file found for $name"
    fi
}

# Stop services
stop_service "django_server"
stop_service "celery_worker"
stop_service "celery_beat"

# Also try to kill any remaining processes
echo ""
echo "🧹 Cleaning up any remaining processes..."
pkill -f "uvicorn config.asgi" 2>/dev/null || true
pkill -f "celery.*worker" 2>/dev/null || true
pkill -f "celery.*beat" 2>/dev/null || true

echo ""
echo "✅ All services stopped"
