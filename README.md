# Local Discord Agent

This project consists of two main components:
1. A Python FastAPI application for handling agent functionality
2. A Discord bot built with Node.js for user interaction

![conv_demo](assets/conv_demo.png)


## Prerequisites

- Python 3.12 or higher
- Node.js 18.x or higher
- npm (Node Package Manager)
- A Discord application and bot token
- Environment variables properly configured

## Setup and Installation

### Python FastAPI Application (basicagent)

1. Navigate to the Python application directory:
   ```bash
   cd basicagent
   ```

2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   - Copy `.env.example` to `.env` (if available)
   - Set required environment variables

### Discord Bot (discord-llm-bot)

1. Navigate to the Discord bot directory:
   ```bash
   cd discord-llm-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env` (if available)
   - Set your Discord bot token and other required variables

## Running the Applications

### Start the Python FastAPI Application

1. Navigate to the basicagent directory:
   ```bash
   cd basicagent
   ```

2. Run the application:
   ```bash
   uvicorn fast_memory:app --reload
   ```

The API will be available at `http://localhost:8000`

### Start the Discord Bot

1. Navigate to the discord-llm-bot directory:
   ```bash
   cd discord-llm-bot
   ```

2. Register slash commands (only needed once or when commands change):
   ```bash
   npm run register
   ```

3. Start the bot:
   ```bash
   npm start
   ```

For development with auto-reload:
   ```bash
   npm run dev
   ```

## Environment Variables

### basicagent/.env
Required environment variables for the Python application:
- Configure as needed for your FastAPI application

### discord-llm-bot/.env
Required environment variables for the Discord bot:
- `DISCORD_TOKEN`: Your Discord bot token
- Additional configuration as needed

## Development

- The Python application uses FastAPI for the backend API
- The Discord bot uses discord.js for Discord integration
- Both applications should be running simultaneously for full functionality

## Author

Jack 