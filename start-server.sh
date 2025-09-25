#!/bin/bash

# Start the weather dashboard with Python HTTP server
# This avoids CORS issues that can occur with Live Server

echo "🌤️  Starting Weather Dashboard Server..."
echo "📡 Server will be available at: http://localhost:8000"
echo "⚠️  Use this instead of Live Server to avoid forecast loading issues"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found, starting server..."
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "✅ Python found, starting server..."
    python -m http.server 8000
else
    echo "❌ Python not found. Please install Python to run the server."
    echo "💡 Alternative: Use any other HTTP server in this directory"
    exit 1
fi