#!/bin/bash

# Setup script for MCP Bot Orchestrator
# This script helps set up all components

set -e

echo "=========================================="
echo "MCP Bot Orchestrator Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install npm${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.8+${NC}"
    exit 1
fi

if ! command -v mongosh &> /dev/null; then
    echo -e "${YELLOW}⚠️  mongosh not found. Make sure MongoDB is installed and running${NC}"
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"
echo ""

# Setup PixelLab MCP Server
echo "=========================================="
echo "Setting up PixelLab MCP Server..."
echo "=========================================="
cd mcp-servers/pixellab

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# PixelLab MCP Server Configuration
PIXELLAB_API_KEY=your_pixellab_api_key_here
EOF
    echo -e "${YELLOW}⚠️  Please edit mcp-servers/pixellab/.env and add your PIXELLAB_API_KEY${NC}"
fi

echo "Installing dependencies..."
npm install

echo "Building..."
npm run build

echo -e "${GREEN}✅ PixelLab MCP Server setup complete${NC}"
echo ""

# Setup Python Tools MCP Server
echo "=========================================="
echo "Setting up Python Tools MCP Server..."
echo "=========================================="
cd ../../mcp-servers/tools-python

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Python Tools MCP Server Configuration
GREYNOISE_API_KEY=
EOF
fi

echo "Installing dependencies..."
pip3 install -r requirements.txt

echo -e "${GREEN}✅ Python Tools MCP Server setup complete${NC}"
echo ""

# Setup Discord Bot
echo "=========================================="
echo "Setting up Discord Bot..."
echo "=========================================="
cd ../../discord-llm-bot

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Discord Bot Configuration

# Discord API credentials
DISCORD_TOKEN=your_discord_bot_token_here
APP_ID=your_discord_app_id_here
GUILD_ID=
BOT_NAME=Assistant

# Grok AI configuration
GROK_API_KEY=your_grok_api_key_here
GROK_MODEL=grok-4-fast
GROK_BASE_URL=https://api.x.ai/v1
GROK_TEMPERATURE=0.2
GROK_MAX_TOKENS=1000

# MongoDB for conversation history
MONGO_URI=mongodb://localhost:27017/discord_bot

# PixelLab API credentials
PIXELLAB_API_KEY=your_pixellab_api_key_here

# GreyNoise API (optional)
GREYNOISE_API_KEY=

# Cache configuration
CACHE_TTL_MINUTES=30
MAX_REQUESTS_PER_USER_PER_HOUR=20

# Custom error message
ERROR_MESSAGE=I'm having trouble right now. Please try again in a moment! 🙏
EOF
    echo -e "${YELLOW}⚠️  Please edit discord-llm-bot/.env and add your credentials${NC}"
fi

echo "Installing dependencies..."
npm install

echo "Building..."
npm run build

echo -e "${GREEN}✅ Discord Bot setup complete${NC}"
echo ""

# Summary
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit environment files with your API keys:"
echo "   - discord-llm-bot/.env"
echo "   - mcp-servers/pixellab/.env"
echo ""
echo "2. Ensure MongoDB is running:"
echo "   brew services start mongodb-community  # macOS"
echo "   sudo systemctl start mongod            # Linux"
echo ""
echo "3. Register Discord slash commands:"
echo "   cd discord-llm-bot"
echo "   npm run register"
echo ""
echo "4. Start the bot:"
echo "   cd discord-llm-bot"
echo "   npm start"
echo ""
echo "For more information, see:"
echo "   - README.md - Main documentation"
echo "   - MIGRATION.md - Migration guide"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"

