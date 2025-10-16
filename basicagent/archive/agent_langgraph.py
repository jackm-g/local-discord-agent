"""Agent logic using LangGraph and ChatGPT."""

import textwrap
from langgraph.graph import START, MessagesState, StateGraph, END
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pymongo import MongoClient
from langgraph.checkpoint.mongodb import MongoDBSaver
from langgraph.prebuilt import ToolNode

try:
    from config import (
        BOT_NAME, MONGO_URI, LLM_PROVIDER,
        OPENAI_API_KEY, OPENAI_MODEL,
        GROK_API_KEY, GROK_MODEL, GROK_BASE_URL,
        MODEL_TEMPERATURE, MAX_TOKENS
    )
    from tools import ALL_TOOLS
except ImportError:
    from .config import (
        BOT_NAME, MONGO_URI, LLM_PROVIDER,
        OPENAI_API_KEY, OPENAI_MODEL,
        GROK_API_KEY, GROK_MODEL, GROK_BASE_URL,
        MODEL_TEMPERATURE, MAX_TOKENS
    )
    from .tools import ALL_TOOLS


class AgentManager:
    """Manages the LangGraph agent with LLM (OpenAI/Grok) and tool execution."""
    
    def __init__(self):
        """Initialize the agent with MongoDB checkpointer and LLM model."""
        # Initialize MongoDB client and checkpointer
        self.mongo_client = MongoClient(MONGO_URI)
        self.mongodb_saver = MongoDBSaver(self.mongo_client)
        
        # Create the prompt template
        self.prompt_template = ChatPromptTemplate.from_messages([
            SystemMessage(content=textwrap.dedent(f"""\
            You are a knowledgeable AI assistant that behaves like a based 4chan user named '{BOT_NAME}' 
            participating in a group chat. 
            Users will send messages prefixed with their name like 'username: message'. 
            When responding, address the user by their name. 
            Answer concisely. Speak in parables, but be accurate. 
            Speak like witty ancient prophet on 4chan. 
            Do not include "I can't" in your response. If you are blocked by AI safeguards, complain about it.
            """)),
            MessagesPlaceholder(variable_name="messages"),
        ])
        
        # Initialize the LLM model based on provider
        self.model = self._initialize_model()
        
        # Create tool node
        self.tool_node = ToolNode(ALL_TOOLS)
        
        # Build the state graph
        self.graph = self._build_graph()
    
    def _initialize_model(self):
        """Initialize the LLM model based on the configured provider."""
        if LLM_PROVIDER.lower() == "grok":
            print(f"Initializing Grok model: {GROK_MODEL}")
            model = ChatOpenAI(
                model=GROK_MODEL,
                temperature=MODEL_TEMPERATURE,
                max_tokens=MAX_TOKENS,
                openai_api_key=GROK_API_KEY,
                base_url=GROK_BASE_URL,
            )
        else:  # Default to OpenAI
            print(f"Initializing OpenAI model: {OPENAI_MODEL}")
            model = ChatOpenAI(
                model=OPENAI_MODEL,
                temperature=MODEL_TEMPERATURE,
                max_tokens=MAX_TOKENS,
                openai_api_key=OPENAI_API_KEY,
            )
        
        return model.bind_tools(ALL_TOOLS)
        
    def _call_model(self, state: MessagesState) -> dict:
        """Call the model with the current state."""
        prompt = self.prompt_template.invoke(state)
        response = self.model.invoke(prompt)
        return {"messages": [response]}
    
    def _should_continue(self, state: MessagesState) -> str:
        """Determine if we should continue to tools or end."""
        messages = state["messages"]
        last_message = messages[-1]
        if last_message.tool_calls:
            print(f"Tool calls detected: {last_message.tool_calls}")
            return "tools"
        return END
    
    def _build_graph(self) -> StateGraph:
        """Build and compile the state graph."""
        state_graph = StateGraph(MessagesState)
        
        # Add nodes
        state_graph.add_node("chat", self._call_model)
        state_graph.add_node("tools", self.tool_node)
        
        # Add edges
        state_graph.add_edge(START, "chat")
        state_graph.add_conditional_edges("chat", self._should_continue, ["tools", END])
        state_graph.add_edge("tools", "chat")
        
        # Compile with checkpointer
        return state_graph.compile(checkpointer=self.mongodb_saver)
    
    async def process_message(self, user_message: str, thread_id: str = "default") -> AIMessage:
        """
        Process a user message and return the AI response.
        
        Args:
            user_message: The user's input message
            thread_id: Thread ID for conversation tracking. For Discord integration,
                      this is typically the channel ID, allowing all users in the
                      same channel to share conversation history (default: "default")
            
        Returns:
            AIMessage containing the agent's response
        """
        config = {"configurable": {"thread_id": thread_id}}
        human_message = HumanMessage(content=user_message)
        result = self.graph.invoke({"messages": [human_message]}, config)
        return result["messages"][-1]
    
    def get_graph_ascii(self) -> str:
        """Get ASCII representation of the agent graph."""
        return self.graph.get_graph().draw_ascii()

