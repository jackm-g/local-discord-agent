# Basic Agent - LLM-Powered Conversational Agent

A sophisticated conversational AI agent powered by OpenAI (ChatGPT) or Grok with tool execution capabilities, built using LangGraph and FastAPI.

## Architecture

The project follows a clean, modular architecture:

```
basicagent/
├── config.py          # Configuration and environment variables
├── tools.py           # Tool definitions (weather, time, GreyNoise, etc.)
├── agent.py           # LangGraph agent logic with ChatGPT integration
├── api.py             # FastAPI server endpoints
├── main.py            # Application entry point
└── requirements.txt   # Python dependencies
```

### Key Components

- **config.py**: Centralized configuration management for API keys, model settings, and server configuration
- **tools.py**: Modular tool definitions using LangChain's `@tool` decorator
- **agent.py**: `AgentManager` class that handles the LangGraph state machine and ChatGPT interactions
- **api.py**: FastAPI application with REST endpoints for inference
- **main.py**: Entry point that starts the server and displays agent information

## Features

- 🤖 **Multi-LLM Support**: Compatible with OpenAI (ChatGPT) and Grok models
- ⚡ **Grok Fast Reasoning**: Support for grok-4-fast model with advanced reasoning capabilities
- 🔧 **Tool Execution**: Supports multiple tools including weather queries, time retrieval, and IP intelligence
- 💾 **Conversation Memory**: MongoDB-based checkpointing for conversation history
- 🔄 **Async Support**: Fully asynchronous API for high performance
- 🎯 **Thread Management**: Support for multiple conversation threads
- 📊 **GreyNoise Integration**: IP threat intelligence lookup capabilities

## Prerequisites

- Python 3.8+
- MongoDB instance (local or remote)
- OpenAI API key OR Grok API key
- GreyNoise API key (optional, will use community API if not provided)

## Setup

### 1. Install Dependencies

```bash
cd basicagent
# Make a venv here if needed
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the `basicagent` directory:

#### Option A: Using OpenAI (ChatGPT)
```bash
# Bot Configuration
BOT_NAME=YourBotName

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/agent_db

# LLM Provider (openai or grok)
LLM_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini

# Model Configuration
MODEL_TEMPERATURE=0.2
MAX_TOKENS=500

# GreyNoise Configuration (optional)
GREYNOISE_API_KEY=your_greynoise_api_key_here

# Server Configuration
HOST=localhost
PORT=8995
```

#### Option B: Using Grok (with Fast Reasoning)
```bash
# Bot Configuration
BOT_NAME=YourBotName

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/agent_db

# LLM Provider (openai or grok)
LLM_PROVIDER=grok

# Grok Configuration
GROK_API_KEY=your_grok_api_key_here
GROK_MODEL=grok-4-fast
GROK_BASE_URL=https://api.x.ai/v1

# Model Configuration
MODEL_TEMPERATURE=0.2
MAX_TOKENS=500

# GreyNoise Configuration (optional)
GREYNOISE_API_KEY=your_greynoise_api_key_here

# Server Configuration
HOST=localhost
PORT=8995
```

### 3. Start the Server

You can start the server in two ways:

**Option 1: Run from the basicagent directory**
```bash
cd basicagent
python main.py
```

**Option 2: Run as a module from the parent directory**
```bash
python -m basicagent.main
```

The server will start on `http://localhost:8995` (or your configured host/port).

## API Usage

### Inference Endpoint

Send messages to the agent:

```bash
curl -X POST http://localhost:8995/inference \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the weather in San Francisco?",
    "thread_id": "user_123"
  }'
```

Response:

```json
{
  "ai_response": "Verily, in the city by the bay, the mists do gather...",
  "thread_id": "user_123"
}
```

### Health Check

```bash
curl http://localhost:8995/health
```

### Root Endpoint

```bash
curl http://localhost:8995/
```

## Available Tools

The agent has access to the following tools:

1. **get_weather(location)**: Get weather information for a location
2. **get_coolest_cities()**: Get a list of cool cities
3. **get_current_time()**: Get the current time
4. **greynoise_ip_address_tool(ip_address)**: Get threat intelligence data for an IP address

## Conversation Threading

The agent supports multiple conversation threads using the `thread_id` parameter. Each thread maintains its own conversation history in MongoDB:

```python
# Discord Channel 1
{"message": "user1: Hello", "thread_id": "discord_channel_123"}
{"message": "user2: Hi there", "thread_id": "discord_channel_123"}  # Same thread

# Discord Channel 2
{"message": "user1: Different conversation", "thread_id": "discord_channel_456"}
```

**For Discord Integration**: Use the channel ID as the `thread_id` so all users in the same channel share conversation history, while different channels maintain separate conversations.

## Customization

### Adding New Tools

Add new tools in `tools.py`:

```python
@tool
def my_custom_tool(parameter: str):
    """Description of what the tool does."""
    # Your tool logic here
    return result

# Add to ALL_TOOLS list
ALL_TOOLS = [
    get_weather,
    get_coolest_cities,
    get_current_time,
    greynoise_ip_address_tool,
    my_custom_tool,  # Add your tool here
]
```

### Modifying the Agent Personality

Edit the system prompt in `agent.py`:

```python
SystemMessage(content=textwrap.dedent(f"""\
    Your custom system prompt here...
"""))
```

### Changing the Model

Update the model in your `.env` file:

#### For OpenAI:
```bash
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-5-mini  
MAX_TOKENS=1000          # Increase token limit
MODEL_TEMPERATURE=0.7    # Adjust creativity
```

#### For Grok:
```bash
LLM_PROVIDER=grok
GROK_MODEL=grok-4-fast   # Fast reasoning model
MAX_TOKENS=1000          # Increase token limit
MODEL_TEMPERATURE=0.7    # Adjust creativity
```

Available Grok models:
- `grok-4-fast` - Fast reasoning model with tool support
- `grok-4` - Standard Grok model

## Development

### Project Structure

The codebase follows these principles:

- **Separation of Concerns**: Each module has a single, well-defined responsibility
- **Dependency Injection**: Configuration is injected from `config.py`
- **Type Hints**: All functions include type annotations
- **Async/Await**: Uses modern async patterns for performance
- **Error Handling**: Comprehensive error handling in API endpoints

### Extending the Agent

To extend the agent's capabilities:

1. Add new tools in `tools.py`
2. Update configuration in `config.py` if needed
3. Modify agent behavior in `agent.py`
4. Add new API endpoints in `api.py`

## Troubleshooting

### MongoDB Connection Issues

Ensure MongoDB is running and accessible:

```bash
# Test connection
mongosh $MONGO_URI
```

### LLM API Errors

**For OpenAI:**
- Verify your API key is correct
- Check your OpenAI account has sufficient credits
- Ensure the model name is valid (e.g., `gpt-5-mini`)

**For Grok:**
- Verify your Grok API key is correct
- Ensure you have access to the Grok API (via X.AI)
- Confirm the model name is valid (e.g., `grok-4-fast`)
- Check that the base URL is correct: `https://api.x.ai/v1`

### Import Errors

If you get import errors, ensure all dependencies are installed:

```bash
pip install -r requirements.txt --upgrade
```

## License

This project is part of the local-discord-agent repository.

## Contributing

Feel free to open issues or submit pull requests for improvements!
