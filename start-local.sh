#!/bin/bash

echo "🍱 Starting Lunchbox AI Bot with Admin Dashboard..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the bot
echo "🚀 Starting bot..."
node src/index.js
