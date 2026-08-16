#!/bin/bash
# Domain-X Fast Startup Script (Backend & Frontend)

echo "=================================================="
echo "🚀 Starting Domain-X Fast Stack..."
echo "=================================================="

# Function to check and kill process on a given port
kill_port() {
  PORT=$1
  PID=$(lsof -ti:$PORT 2>/dev/null)
  if [ -n "$PID" ]; then
    echo "🧹 Freeing port $PORT (killing PID $PID)..."
    kill -9 $PID 2>/dev/null || true
  fi
}

# Free ports 5001 (Python API) and 3000 (Next.js Frontend)
kill_port 5001
kill_port 3000

# Start Python Telemetry API Backend on port 5001
echo "⚡ Starting Python Telemetry API Backend (port 5001)..."
python3 api.py > backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend launched (PID: $BACKEND_PID, logs: backend.log)"

# Wait briefly for backend to initialize
sleep 1

# Start Next.js Frontend on port 3000
echo "🌐 Starting Next.js Frontend (port 3000)..."
npm run dev

