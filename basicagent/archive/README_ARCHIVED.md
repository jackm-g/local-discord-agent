# Archived: LangGraph Agent Implementation

This directory contains the previous implementation of the agent that used LangGraph with automatic tool calling.

## Architecture Change

**Old Architecture (archived):**
- Discord Bot → Python FastAPI Agent → LangGraph → Automatic Tool Execution
- LangGraph handled tool routing automatically
- Used LangChain's built-in tool calling mechanism

**New Architecture (current):**
- Discord Bot (TypeScript) → Grok Planner → MCP Servers → Tools
- Bot-as-Orchestrator pattern
- Manual JSON-based tool planning with Grok
- MCP (Model Context Protocol) for tool execution
- Separate MCP servers for PixelLab and Python tools

## Why the Change?

1. **Better Control**: Manual tool planning gives more control over when and how tools are called
2. **MCP Standard**: Using Model Context Protocol enables tool reuse across multiple clients
3. **Separation of Concerns**: PixelLab integration is isolated in its own MCP server
4. **Scalability**: MCP servers can be scaled independently
5. **Flexibility**: Easier to add new tools without modifying agent code

## Files Archived

- `agent_langgraph.py` - Original LangGraph agent implementation
- Uses MongoDB checkpointer for conversation state
- Includes system prompt and tool binding logic

## Original Features

- ✅ LangGraph state machine
- ✅ Automatic tool calling via LangChain
- ✅ MongoDB conversation persistence
- ✅ Support for OpenAI and Grok models
- ✅ Existing tools: weather, time, GreyNoise IP intelligence

These features are preserved in the new architecture, but implemented differently.

