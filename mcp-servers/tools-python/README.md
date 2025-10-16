# Python Tools MCP Server

Model Context Protocol (MCP) server wrapping utility tools.

## Features

- **get_weather**: Get weather information for a location
- **get_coolest_cities**: Get a list of the coolest cities
- **get_current_time**: Get the current time
- **greynoise_ip_address**: Get threat intelligence for an IP address

## Installation

```bash
pip install -r requirements.txt
```

## Configuration

Optional `.env` file:

```bash
# Optional: GreyNoise API key for full features
# If not provided, uses community API
GREYNOISE_API_KEY=your_key_here
```

## Usage

This MCP server is designed to be spawned by an MCP client via stdio.

### Standalone Testing

```bash
python3 server.py
```

### As MCP Server

The Discord bot spawns this server automatically. See `discord-llm-bot/src/config.ts` for configuration.

## Tools

### get_weather

Get weather information for a location.

**Input:**
```json
{
  "location": "San Francisco"
}
```

**Output:**
```
It's 60 degrees and foggy.
```

### get_coolest_cities

Get a list of cool cities.

**Input:**
```json
{}
```

**Output:**
```
nyc, sf
```

### get_current_time

Get the current time.

**Input:**
```json
{}
```

**Output:**
```
The current time is 02:30 PM
```

### greynoise_ip_address

Get GreyNoise threat intelligence for an IP address.

**Input:**
```json
{
  "ip_address": "8.8.8.8"
}
```

**Output:**
```json
{
  "ip": "8.8.8.8",
  "seen": true,
  "classification": "benign",
  "first_seen": "2020-01-01",
  "last_seen": "2024-10-12",
  "tags": ["dns", "google"],
  "metadata": {...}
}
```

## Dependencies

- `mcp` - MCP server library
- `greynoise` - GreyNoise API client
- `requests` - HTTP client
- `python-dotenv` - Environment configuration

## Architecture

- `server.py` - MCP server implementation
- `tools.py` - Tool implementations (copied from basicagent)
- `requirements.txt` - Python dependencies

