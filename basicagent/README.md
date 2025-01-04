# AI Chat Agent with Memory

A FastAPI-based chat agent that uses Ollama for LLM interactions and MongoDB for maintaining conversation state. The agent is designed to provide conversational AI capabilities with persistent memory across interactions.

## Features

- FastAPI-based REST API
- Ollama integration for LLM capabilities
- MongoDB-based conversation state persistence
- Configurable chat personality and response style
- Error handling and logging
- Type-safe implementation

## Prerequisites

- Python 3.12+
- MongoDB running locally or accessible via URL
- Ollama installed and running locally

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd basicagent
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file with the following variables:
```
BOT_NAME=<your-bot-name>
MONGO_URI=mongodb://localhost:27017
MODEL=<your-ollama-model>
```

## Usage

1. Start the server:
```bash
python fast_memory.py
```

2. Make API requests:
```bash
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"message": "Your message here"}' \
     http://localhost:8995/inference
```

## API Documentation

### POST /inference

Process a chat message and get AI response.

**Request Body:**
```json
{
    "message": "string"
}
```

**Response:**
```json
{
    "ai_response": "string"
}
```

## Development

- The main application logic is in `fast_memory.py`
- Environment variables are managed through `.env`
- Logging is configured at the INFO level

## License

This project is licensed under the MIT License - see the LICENSE file for details. 