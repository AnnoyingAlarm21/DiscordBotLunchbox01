#!/bin/bash

echo "🍱 Starting Lunchbox Discord Bot..."
echo "=================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy env.example to .env and fill in your values:"
    echo "cp env.example .env"
    echo ""
    echo "Required values:"
    echo "- DISCORD_TOKEN"
    echo "- DISCORD_CLIENT_ID" 
    echo "- DISCORD_GUILD_ID"
    echo "- GROQ_API_KEY"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Deploy commands first
echo "🚀 Deploying Discord commands..."
npm run deploy

# Start the bot
echo "🍱 Starting the bot..."
npm start
