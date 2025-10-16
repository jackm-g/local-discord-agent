"""FastAPI server for the agent."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

try:
    from agent import AgentManager
except ImportError:
    from .agent import AgentManager

# Initialize FastAPI app
app = FastAPI(
    title="LLM Agent API",
    description="A conversational AI agent with tool usage capabilities (OpenAI/Grok)",
    version="1.0.0"
)

# Initialize the agent manager
agent_manager = AgentManager()


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "LLM Agent API",
        "version": "1.0.0",
        "description": "Conversational AI with OpenAI/Grok support",
        "endpoints": {
            "POST /inference": "Send a message to the agent",
            "GET /health": "Check API health status"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/inference")
async def inference_endpoint(request: Request):
    """
    Main inference endpoint for processing user messages.
    
    Request body:
    {
        "message": "Your message here",
        "thread_id": "optional-thread-id"  // Optional, defaults to "default"
                                           // For Discord: use channel ID to enable shared
                                           // conversation history among all users in a channel
    }
    
    Response:
    {
        "ai_response": "Agent's response",
        "thread_id": "thread-id-used"
    }
    """
    try:
        data = await request.json()
        message = data.get("message")
        thread_id = data.get("thread_id", "default")
        
        if not message:
            return JSONResponse(
                status_code=400,
                content={"error": "Message field is required"}
            )
        
        # Process the message through the agent
        response = await agent_manager.process_message(message, thread_id)
        
        return JSONResponse(content={
            "ai_response": response.content,
            "thread_id": thread_id
        })
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

