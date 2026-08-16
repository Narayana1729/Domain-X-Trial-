#!/bin/bash
# Domain-X Clean Stop Script

echo "=================================================="
echo "🛑 Stopping Domain-X Stack..."
echo "=================================================="

# Stop process on port 5001 (Python API)
PID_5001=$(lsof -ti:5001 2>/dev/null)
if [ -n "$PID_5001" ]; then
  echo "Stopping Python Backend API on port 5001 (PID: $PID_5001)..."
  kill -9 $PID_5001 2>/dev/null || true
else
  echo "Python Backend API (port 5001) is not running."
fi

# Stop process on port 3000 (Next.js Frontend)
PID_3000=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PID_3000" ]; then
  echo "Stopping Next.js Frontend on port 3000 (PID: $PID_3000)..."
  kill -9 $PID_3000 2>/dev/null || true
else
  echo "Next.js Frontend (port 3000) is not running."
fi

# Kill any lingering api.py processes
pkill -f "python3 api.py" 2>/dev/null || true

echo "✅ All Domain-X services stopped cleanly."
