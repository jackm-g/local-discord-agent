from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn
from langchain.schema import AIMessage
from langchain_ollama import ChatOllama

# Create a FastAPI application
app = FastAPI()

async def ollama_llm(user_message: str) -> AIMessage:
    llm = ChatOllama(
    model="llama3.2:latest",
    temperature=0.1,
    # other params...
)

    messages = [
        (
            "system",
            "You are a knowledgeable AI assistant named 'DozenBooch'. \
            Answer in concise parables but be accurate. \
            Speak like an ancient prophet.",
        ),
        (
            "human", 
            user_message
        ),
    ]
    ai_msg = llm.invoke(messages)
    print(ai_msg.content)
    return ai_msg

@app.post("/inference")
async def inference_endpoint(request: Request):
    # Parse the incoming JSON data
    data = await request.json()
    message = data.get("message", "")

    # Generate a response using the local Ollama instance
    # Depending on your usage, you may want to add arguments like max_tokens=512, etc.
    response_text = await ollama_llm(message)
    response_text = response_text.content
    # Return the result in JSON format
    return JSONResponse(content={"ai_response": response_text})

if __name__ == "__main__":
    # Run the server on localhost:8995
    uvicorn.run(app, host="localhost", port=8995)
