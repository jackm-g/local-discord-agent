# Local Discord Agent

A production-ready Discord bot with MCP-based tool orchestration, Grok AI planning, and PixelLab sprite generation.

![conv_demo](assets/conv_demo.png)

## Overview

This project implements a **Bot-as-Orchestrator** architecture where the Discord bot uses Grok for intelligent tool planning and executes tools via the Model Context Protocol (MCP).

### Components

### 1. **Discord Bot Orchestrator** (`discord-llm-bot/`)
TypeScript bot that coordinates everything:
- 💬 Responds to @mentions 
- 🧠 Uses Grok for JSON-based tool planning
- 🔧 Routes tool calls to MCP servers
- 💾 MongoDB conversation persistence
- ⚡ Result caching and rate limiting

### 2. **PixelLab MCP Server** (`mcp-servers/pixellab/`)
TypeScript MCP server for sprite generation:
- 🎨 Generate pixel art sprites from prompts
- 🔄 Rotate sprites at multiple angles
- 🎬 Animate sprites with customizable FPS
- 🔐 Secure PixelLab API integration

### 3. **X.AI Image Generation MCP Server** (`mcp-servers/xai-image/`)
TypeScript MCP server for X.AI image generation:
- 🎨 Generate high-quality images using Grok-2-Vision-1212
- 🖼️ Support for multiple image sizes and styles
- ⚡ Fast image generation with quality options
- 🔐 Secure X.AI API integration

### 4. **Python Tools MCP Server** (`mcp-servers/tools-python/`)
Python MCP server wrapping utility tools:
- 🌤️ Weather information
- ⏰ Current time
- 🔍 GreyNoise IP intelligence
- 🏙️ Coolest cities lookup


## Architecture

```
Discord User
     ↓
Discord Bot (TypeScript)
     ↓
  [Grok Planner] → JSON tool plan
     ↓
  [Validator] → Zod schemas
     ↓
  [MCP Client] → stdio connections
     ↓
  ┌─────────────┬─────────────┬─────────────┐
  ↓             ↓             ↓
PixelLab MCP    X.AI Image    Python Tools
Server          MCP Server    MCP Server
  ↓             ↓             ↓
PixelLab API    X.AI API      Utility Functions
```

## Prerequisites

- **Node.js 18.x+** and **TypeScript**
- **Python 3.8+** (for Python tools MCP server)
- **MongoDB** (local or remote instance)
- **Grok API Key** (from x.AI) - used for both LLM and image generation
- **Discord Bot Token** (from Discord Developer Portal)
- **PixelLab API Key** (for sprite generation)
- **GreyNoise API Key** (optional, for IP intelligence)

## Quick Start

### 1. Set Up MongoDB

Ensure MongoDB is running:
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Or use MongoDB Atlas (cloud) - update MONGO_URI accordingly
```

### 2. Set Up MCP Servers

**PixelLab MCP Server:**
```bash
cd mcp-servers/pixellab

# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env and add your PIXELLAB_API_KEY

# Build
npm run build
```

**X.AI Image Generation MCP Server:**
```bash
cd mcp-servers/xai-image

# Install dependencies
npm install

# Configure
cp env.example .env
# Note: XAI_API_KEY will be automatically set from GROK_API_KEY

# Build
npm run build
```

**Python Tools MCP Server:**
```bash
cd mcp-servers/tools-python

# Install dependencies
pip install -r requirements.txt

# Optional: Configure GreyNoise
cp .env.example .env
# Edit .env and add GREYNOISE_API_KEY (optional)
```

### 3. Set Up Discord Bot

```bash
cd discord-llm-bot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
# - DISCORD_TOKEN
# - APP_ID
# - GROK_API_KEY (used for both LLM and image generation)
# - MONGO_URI
# - PIXELLAB_API_KEY

# Build
npm run build

# Register slash commands
npm run register

# Start the bot
npm start
```

### 4. Test It Out

**Using @mentions:**
```
@YourBot what's the weather in San Francisco?
@YourBot make me a 32x32 pixel art knight
@YourBot generate an image of a sunset over mountains
@YourBot check IP 8.8.8.8
```

The bot will:
1. Show typing indicator
2. Plan with Grok whether to use tools
3. Execute tools via MCP servers
4. Reply with results and images

## Environment Variables

### `discord-llm-bot/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | ✅ Yes | Your Discord bot token |
| `APP_ID` | ✅ Yes | Discord application ID |
| `GROK_API_KEY` | ✅ Yes | Grok API key from x.AI |
| `MONGO_URI` | ✅ Yes | MongoDB connection string |
| `PIXELLAB_API_KEY` | ✅ Yes | PixelLab API key |
| `GUILD_ID` | No | Discord server ID (for testing) |
| `BOT_NAME` | No | Bot name (default: Assistant) |
| `GROK_MODEL` | No | Model name (default: grok-beta) |
| `GROK_BASE_URL` | No | API base URL |
| `GREYNOISE_API_KEY` | No | For IP intelligence |
| `CACHE_TTL_MINUTES` | No | Cache duration (default: 30) |
| `MAX_REQUESTS_PER_USER_PER_HOUR` | No | Rate limit (default: 20) |
| `ERROR_MESSAGE` | No | Custom error message |

### `mcp-servers/pixellab/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PIXELLAB_API_KEY` | ✅ Yes | Your PixelLab API key |
| `PIXELLAB_BASE_URL` | No | Custom API URL (optional) |

### `mcp-servers/xai-image/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `XAI_API_KEY` | ✅ Yes | Your X.AI API key (same as GROK_API_KEY) |

**Note:** The Discord bot automatically passes the `GROK_API_KEY` as `XAI_API_KEY` to this server, so you don't need to set it manually.

### `mcp-servers/tools-python/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `GREYNOISE_API_KEY` | No | GreyNoise API key (uses community API if not provided) |

## Development

### Tech Stack

**Discord Bot (TypeScript):**
- discord.js - Discord API wrapper
- @modelcontextprotocol/sdk - MCP client
- Zod - Schema validation
- MongoDB - Conversation persistence
- Axios - HTTP client for Grok API

**PixelLab MCP Server (TypeScript):**
- @modelcontextprotocol/sdk - MCP server
- Zod - Input validation
- Axios - PixelLab API client

**Python Tools MCP Server (Python):**
- mcp - MCP server library
- greynoise - IP intelligence
- requests - HTTP client

## Continuous Integration

This project uses GitHub Actions for automated testing on every push to the main branch.

### CI Workflow Features:
- ✅ **Automated Testing**: Runs Jest unit tests on Node.js 18.x and 20.x
- ✅ **TypeScript Compilation**: Ensures code compiles without errors
- ✅ **Test Coverage**: Generates coverage reports for all test suites
- ✅ **Multi-Node Testing**: Tests compatibility across Node.js versions
- ✅ **Artifact Upload**: Saves test results and coverage reports

### Test Coverage:
The test suite includes comprehensive validation of:
- **YAML Configuration**: Validates `prompts.yaml` structure and content
- **Prompt Loading**: Tests YAML-to-config loading with fallbacks
- **Placeholder Replacement**: Verifies `{BOT_NAME}` and `{TOOL_DESCRIPTIONS}` substitution
- **Error Handling**: Tests graceful fallbacks when YAML files are missing/corrupted
- **Integration Testing**: Validates end-to-end prompt usage in GrokPlanner

### Running Tests Locally:
```bash
cd discord-llm-bot
npm test              # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
```

## License
