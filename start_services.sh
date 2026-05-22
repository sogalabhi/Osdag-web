#!/bin/bash

# OSdag Web Services Startup Script
# This script helps start all required services for PSO Dashboard testing

echo "🚀 Starting OSdag Web Services for PSO Dashboard Testing"
echo "=========================================================="

# Check if Redis is running
echo "📍 Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   sudo systemctl start redis-server"
    echo "   OR: redis-server"
    exit 1
fi

echo ""

# Function to start service in background
start_service() {
    local name=$1
    local command=$2
    local log_file=$3

    echo "🔄 Starting $name..."
    eval "$command" > "$log_file" 2>&1 &
    local pid=$!
    echo $pid > "${name}.pid"
    sleep 2

    if kill -0 $pid 2>/dev/null; then
        echo "✅ $name started (PID: $pid)"
        echo "   Logs: $log_file"
    else
        echo "❌ $name failed to start. Check logs: $log_file"
        exit 1
    fi
    echo ""
}

# Start Django ASGI server (Uvicorn)
cd backend
start_service "django_server" "uvicorn config.asgi:application --host 0.0.0.0 --port 8000 --reload" "../logs/django.log"

# Start Celery worker
start_service "celery_worker" "celery -A config worker --loglevel=info --concurrency=2" "../logs/celery.log"

# Start Celery beat (optional)
# start_service "celery_beat" "celery -A config beat --loglevel=info" "../logs/celery_beat.log"

# Return to root directory
cd ..

echo "🎯 All backend services started!"
echo ""
echo "📋 Service Status:"
echo "   Django ASGI (Uvicorn): http://localhost:8000"
echo "   Celery Worker: Running"
echo "   Redis: Running"
echo ""
echo "🖥️  Now start the frontend in another terminal:"
echo "   cd osdagclient"
echo "   npm start"
echo ""
echo "🧪 Ready for PSO Dashboard testing!"
echo "   Follow: PSO_DASHBOARD_TESTING_GUIDE.md"
echo ""
echo "🔄 To stop services:"
echo "   ./stop_services.sh"
echo ""

# Keep script running to show logs
echo "📊 Showing Django server logs (Ctrl+C to exit)..."
tail -f logs/django.log
