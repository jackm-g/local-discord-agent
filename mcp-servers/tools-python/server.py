#!/usr/bin/env python3

"""
Python Tools MCP Server
Exposes existing utility tools (weather, time, GreyNoise) via MCP protocol
"""

import asyncio
import json
import sys
from typing import Any
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource
from dotenv import load_dotenv
import os

# Import tool implementations
from tools import (
    get_weather,
    get_coolest_cities,
    get_current_time,
    greynoise_ip_address_tool,
)

load_dotenv()

# Define MCP tools
TOOLS = [
    Tool(
        name="get_weather",
        description="Get the current weather for a specific location",
        inputSchema={
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City name or location (e.g., 'San Francisco', 'NYC')",
                }
            },
            "required": ["location"],
        },
    ),
    Tool(
        name="get_coolest_cities",
        description="Get a list of the coolest cities",
        inputSchema={
            "type": "object",
            "properties": {},
        },
    ),
    Tool(
        name="get_current_time",
        description="Get the current time",
        inputSchema={
            "type": "object",
            "properties": {},
        },
    ),
    Tool(
        name="greynoise_ip_address",
        description="Get GreyNoise threat intelligence data for an IP address",
        inputSchema={
            "type": "object",
            "properties": {
                "ip_address": {
                    "type": "string",
                    "description": "IP address to look up (e.g., '1.2.3.4')",
                    "pattern": r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$",
                }
            },
            "required": ["ip_address"],
        },
    ),
]


app = Server("tools-python-mcp-server")


@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools."""
    return TOOLS


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent | ImageContent | EmbeddedResource]:
    """Handle tool execution."""
    try:
        if name == "get_weather":
            location = arguments.get("location", "")
            result = get_weather(location)
            return [TextContent(type="text", text=result)]

        elif name == "get_coolest_cities":
            result = get_coolest_cities()
            return [TextContent(type="text", text=result)]

        elif name == "get_current_time":
            result = get_current_time()
            return [TextContent(type="text", text=result)]

        elif name == "greynoise_ip_address":
            ip_address = arguments.get("ip_address", "")
            result = greynoise_ip_address_tool(ip_address)
            return [TextContent(type="text", text=result)]

        else:
            raise ValueError(f"Unknown tool: {name}")

    except Exception as e:
        error_msg = f"Error executing {name}: {str(e)}"
        return [TextContent(type="text", text=json.dumps({"error": error_msg}))]


async def main():
    """Main entry point for the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        print("Python Tools MCP Server running on stdio", file=sys.stderr)
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())

