"""Main entry point for the agent application."""

import uvicorn

try:
    from api import app, agent_manager
    from config import HOST, PORT
except ImportError:
    from .api import app, agent_manager
    from .config import HOST, PORT


def main():
    """Start the FastAPI server."""
    print("=" * 60)
    print("Starting ChatGPT Agent API Server")
    print("=" * 60)
    print(f"Host: {HOST}")
    print(f"Port: {PORT}")
    print(f"URL: http://{HOST}:{PORT}")
    print("=" * 60)
    print("\nAgent Graph Structure:")
    print(agent_manager.get_graph_ascii())
    print("=" * 60)
    print("\nServer is running. Press CTRL+C to stop.")
    print("=" * 60)
    
    uvicorn.run(app, host=HOST, port=PORT)


if __name__ == "__main__":
    main()

