"""
Basic Agent - A ChatGPT-powered conversational agent with tool execution.

This package provides a modular, well-architected agent system using:
- ChatGPT for language understanding
- LangGraph for state management
- FastAPI for REST API endpoints
- MongoDB for conversation persistence
"""

__version__ = "1.0.0"

try:
    from .agent import AgentManager
    from .api import app
    from .tools import ALL_TOOLS
    from .config import BOT_NAME, OPENAI_MODEL
    
    __all__ = ["AgentManager", "app", "ALL_TOOLS", "BOT_NAME", "OPENAI_MODEL"]
except ImportError:
    # Allow package to be imported even if dependencies aren't installed
    pass

