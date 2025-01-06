from langgraph.graph import START, MessagesState, StateGraph, END
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import AIMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from langgraph.checkpoint.mongodb import MongoDBSaver
from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode

load_dotenv()
BOT_NAME = os.getenv("BOT_NAME")

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)

mongodb_saver = MongoDBSaver(client)


prompt_template = ChatPromptTemplate.from_messages(
    [
        SystemMessage(content=f"You are a knowledgeable AI assistant named '{BOT_NAME}' participating in a group chat. \
        Users will send messages prefixed with their username like 'username: message'. \
        When responding, address the user by their username. \
        Answer in concisely. Speak in parables, but be accurate. \
        Speak like an ancient prophet. \
        Do not include \"I can't\" in your response"),
        MessagesPlaceholder(variable_name="messages"),
    ]
)

@tool
def get_weather(location: str):
    """Call to get the current weather."""
    if location.lower() in ["sf", "san francisco"]:
        return "It's 60 degrees and foggy."
    else:
        return "It's 90 degrees and sunny."


@tool
def get_coolest_cities():
    """Get a list of coolest cities"""
    return "nyc, sf"


# Initialize the model
model = ChatOllama(
    model=os.getenv("MODEL"),
    temperature=0.2,
    num_predict=500
)

model.bind_tools([get_weather, get_coolest_cities])

def call_model(state: MessagesState):
    prompt = prompt_template.invoke(state)
    response = model.invoke(prompt)
    return {"messages": [response]}


state_graph = StateGraph(MessagesState)

state_graph.add_edge(START, "model")
state_graph.add_node("model", call_model)
state_graph.add_edge("tool", END)

state_graph = state_graph.compile(checkpointer=mongodb_saver)
single_config = {"configurable": {"thread_id": "1"}}

app = FastAPI()

async def ollama_llm(user_message: str, config: dict[str, str]) -> AIMessage:
    human_message = HumanMessage(content=user_message)
    ai_msg = state_graph.invoke({"messages": [human_message]}, config)
    return ai_msg["messages"][-1]

@app.post("/inference")
async def inference_endpoint(request: Request):
    try:
        data = await request.json()
        message = data.get("message")
        
        if not message:
            return JSONResponse(
                status_code=400,
                content={"error": "Message field is required"}
            )
            
        response_text = await ollama_llm(message, single_config)
        return JSONResponse(content={"ai_response": response_text.content})
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8995)
