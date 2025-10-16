# Technical Architecture & Engineering Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Major Components](#major-components)
4. [Process Communication](#process-communication)
5. [Database Architecture](#database-architecture)
6. [Long-Term Memory System](#long-term-memory-system)
7. [LLM Orchestration](#llm-orchestration)
8. [Technology Stack](#technology-stack)
9. [Data Flow & Execution](#data-flow--execution)
10. [Security & Configuration](#security--configuration)
11. [Deployment Architecture](#deployment-architecture)

---

## Project Overview

**Local Discord Agent** is a production-ready Discord bot with MCP-based tool orchestration, Grok AI planning, and PixelLab sprite generation. The system implements a **Bot-as-Orchestrator** architecture where the Discord bot acts as the central coordinator, using Grok for intelligent planning and executing tools via the Model Context Protocol (MCP).

### Key Architectural Principles

- **Separation of Concerns**: Each component has a single, well-defined responsibility
- **Protocol-Driven Integration**: Uses MCP (Model Context Protocol) for standardized tool communication
- **Dual LLM Support**: Supports both OpenAI (ChatGPT) and Grok as planning engines
- **Conversation Persistence**: MongoDB-based persistent memory across sessions
- **Type Safety**: TypeScript with Zod validation for runtime type checking
- **Async-First Design**: Fully asynchronous architecture for high performance

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Discord User                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ @mentions / slash commands
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Discord Bot Orchestrator                      │
│                      (TypeScript / Node.js)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Bot Manager (bot.ts)                                    │   │
│  │  • Message routing                                       │   │
│  │  • Rate limiting (20 req/hour/user)                      │   │
│  │  • Typing indicators                                     │   │
│  │  • Embed formatting                                      │   │
│  └─────────────┬───────────────────────────────┬────────────┘   │
│                │                               │                 │
│                ▼                               ▼                 │
│  ┌─────────────────────────┐   ┌────────────────────────────┐  │
│  │  Grok Planner           │   │  Conversation Store        │  │
│  │  (llm/grok.ts)          │   │  (storage/mongo.ts)        │  │
│  │  • Tool planning        │   │  • History retrieval       │  │
│  │  • Response generation  │   │  • Message persistence     │  │
│  │  • JSON validation      │   │  • 100 msg window/channel  │  │
│  └──────────┬──────────────┘   └────────────┬───────────────┘  │
│             │                               │                   │
│             ▼                               │                   │
│  ┌──────────────────────────────────────────▼───────────────┐  │
│  │  MCP Client Manager (mcp/client.ts)                      │  │
│  │  • Spawns/manages MCP servers as child processes         │  │
│  │  • Routes tool calls to appropriate servers              │  │
│  │  • Handles stdio communication                           │  │
│  │  • 6-minute timeout for large operations                 │  │
│  └───────────┬──────────────────────────┬───────────────────┘  │
└──────────────┼──────────────────────────┼──────────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│  PixelLab MCP Server     │   │  Python Tools MCP Server     │
│  (TypeScript/Node.js)    │   │  (Python)                    │
│  ────────────────────    │   │  ────────────────────────    │
│  • stdio transport       │   │  • stdio transport           │
│  • Zod validation        │   │  • Tool implementations      │
│  • PixelLab API client   │   │  • GreyNoise API             │
│  ────────────────────    │   │  • Weather/time utilities    │
│  Tools:                  │   │  ────────────────────────    │
│  • generate_sprite       │   │  Tools:                      │
│  • generate_image_pixflux│   │  • get_weather               │
│  • rotate_sprite         │   │  • get_current_time          │
│  • animate_sprite        │   │  • get_coolest_cities        │
└──────────┬───────────────┘   │  • greynoise_ip_address      │
           │                   └───────────┬──────────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│  PixelLab API            │   │  External APIs               │
│  (REST)                  │   │  • GreyNoise Intelligence    │
│  • Sprite generation     │   │  • Weather services          │
│  • Rotation/animation    │   │                              │
└──────────────────────────┘   └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          Data Layer                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  MongoDB (conversation persistence)                       │  │
│  │  • Database: discord_bot                                  │  │
│  │  • Collection: conversations                              │  │
│  │  • Indexed by: channelId                                  │  │
│  │  • Document structure:                                    │  │
│  │    {                                                      │  │
│  │      channelId: string,                                   │  │
│  │      messages: ConversationMessage[],  // max 100        │  │
│  │      lastUpdated: Date                                    │  │
│  │    }                                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│  • Grok API (x.AI) - Planning & responses                       │
│  • MongoDB - Conversation persistence                            │
│  • PixelLab API - Sprite generation                              │
│  • GreyNoise API - IP intelligence (optional)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Legacy Component (Archived)

```
┌──────────────────────────────────────────────────────────────┐
│  Legacy Agent (basicagent/) - ARCHIVED                       │
│  • LangGraph-based agent implementation                      │
│  • FastAPI server                                            │
│  • Direct OpenAI/Grok integration                            │
│  • MongoDB checkpointing                                     │
│  • Replaced by bot-as-orchestrator architecture             │
└──────────────────────────────────────────────────────────────┘
```

---

## Major Components

### 1. Discord Bot Orchestrator (`discord-llm-bot/`)

**Technology**: TypeScript, Node.js 18+, Discord.js v14

**Purpose**: Central coordination hub that manages all user interactions and orchestrates the entire system.

#### Key Modules:

##### `bot.ts` - Main Bot Logic
- **Responsibilities**:
  - Discord event handling (ClientReady, MessageCreate)
  - Message routing and @mention detection
  - Rate limiting (20 requests/hour/user)
  - Typing indicators during processing
  - Response formatting and embed creation
  - Sprite result visualization
  - Graceful shutdown handling

- **Key Functions**:
  - `processMessage()`: Core message processing pipeline
  - `checkRateLimit()`: Per-user request throttling
  - `cleanSpriteMarkers()`: Strip internal metadata from user-facing messages
  - `stripDataUris()`: Remove base64 images to prevent LLM timeouts

##### `llm/grok.ts` - Grok Planning Engine
- **Responsibilities**:
  - Tool planning via JSON-based prompting
  - Response generation with tool results
  - Direct conversation responses (no tools)
  - JSON parsing and validation

- **Key Methods**:
  - `planTool()`: Decides if/which tool to use
  - `finalizeResponse()`: Generates friendly response after tool execution
  - `generateResponse()`: Direct response without tools
  - `parseToolPlan()`: Validates and extracts tool plans

- **Prompt Engineering**:
  - System prompts designed for reliable JSON output
  - Few-shot examples for tool selection
  - Parameter extraction from natural language
  - Creative personality injection (4chan prophet persona)

##### `mcp/client.ts` - MCP Client Manager
- **Responsibilities**:
  - Spawning MCP server child processes
  - Managing stdio communication pipelines
  - Tool routing to appropriate servers
  - Connection lifecycle management
  - Error handling and recovery

- **Key Methods**:
  - `initialize()`: Spawn and connect to MCP servers
  - `connectToServer()`: Establish stdio transport
  - `callTool()`: Route tool calls with 6-minute timeout
  - `getToolDescriptions()`: Generate prompt-friendly tool list
  - `cleanup()`: Graceful shutdown

##### `storage/mongo.ts` - Conversation Persistence
- **Responsibilities**:
  - MongoDB connection management
  - Conversation history CRUD operations
  - Message truncation (100 message window)
  - Formatted history for LLM context

- **Key Methods**:
  - `connect()`: Initialize MongoDB with indexing
  - `getHistory()`: Retrieve recent messages
  - `addMessage()`: Append with automatic truncation
  - `getFormattedHistory()`: LLM-friendly format
  - `clearHistory()`: Channel reset

##### `storage/cache.ts` - Result Caching
- **Responsibilities**:
  - In-memory caching of tool results
  - TTL-based expiration (30 minutes default)
  - Automatic cleanup
  - Cache key generation

##### `validation/schemas.ts` - Type Validation
- **Responsibilities**:
  - Zod schema definitions for all tools
  - Runtime type validation
  - Input sanitization
  - Error message generation

### 2. PixelLab MCP Server (`mcp-servers/pixellab/`)

**Technology**: TypeScript, Node.js, MCP SDK

**Purpose**: Exposes PixelLab sprite generation capabilities via MCP protocol.

#### Architecture:

```
┌──────────────────────────────────────────────────────┐
│  MCP Server (server.ts)                              │
│  • StdioServerTransport                              │
│  • Tool registration & routing                       │
│  • Request/response handling                         │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│  Schema Validation (schemas.ts)                      │
│  • GenerateSpriteSchema                              │
│  • RotateSpriteSchema                                │
│  • AnimateSpriteSchema                               │
│  • GenerateImagePixfluxSchema                        │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│  PixelLab Client (pixellab-client.ts)                │
│  • HTTP client (Axios)                               │
│  • API request formatting                            │
│  • Response parsing                                  │
│  • Polling for async operations                      │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│  PixelLab REST API                                   │
│  • POST /create-sprite (async)                       │
│  • POST /rotate-sprite                               │
│  • POST /animate-sprite                              │
│  • POST /generate-image-pixflux                      │
└──────────────────────────────────────────────────────┘
```

#### Tool Capabilities:

1. **`generate_sprite`**
   - Multi-directional game sprites (N, S, E, W)
   - Sizes: 16x16, 32x32, 64x64, 128x128
   - Style customization
   - Seed-based reproducibility

2. **`generate_image_pixflux`**
   - Single pixel art images
   - Sizes up to 400x400
   - Isometric view support
   - Transparent backgrounds
   - Fine-grained artistic control (outline, detail, direction)

3. **`rotate_sprite`**
   - Multi-angle sprite sheets
   - Up to 16 rotation angles
   - Returns sprite sheet URL

4. **`animate_sprite`**
   - Animated GIF generation
   - FPS control (1-60)
   - Loop configuration
   - Returns animation URL

### 3. Python Tools MCP Server (`mcp-servers/tools-python/`)

**Technology**: Python 3.8+, MCP Python SDK

**Purpose**: Wraps utility tools in MCP protocol for bot access.

#### Architecture:

```
┌──────────────────────────────────────────────────────┐
│  MCP Server (server.py)                              │
│  • stdio_server transport                            │
│  • Tool registration (@app decorators)               │
│  • Async request handling                            │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│  Tool Implementations (tools.py)                     │
│  • LangChain @tool decorators                        │
│  • Business logic                                    │
│  • External API clients                              │
└──────────────────────────────────────────────────────┘
```

#### Available Tools:

1. **`get_weather`** - Mock weather data (extensible)
2. **`get_current_time`** - System time lookup
3. **`get_coolest_cities`** - Predefined city list
4. **`greynoise_ip_address`** - IP threat intelligence
   - Uses GreyNoise API (paid) or Community API (free)
   - Returns JSON with classification, tags, metadata

### 4. Legacy Agent (`basicagent/`) - ARCHIVED

**Technology**: Python, LangGraph, FastAPI, OpenAI/Grok

**Purpose**: Previous implementation using LangGraph state machines.

**Why Archived**: Replaced by bot-as-orchestrator for better separation of concerns and MCP standardization.

#### Key Concepts (Historical):

- **LangGraph State Machine**: Used `StateGraph` with `MessagesState`
- **MongoDB Checkpointing**: `MongoDBSaver` for conversation persistence
- **Tool Binding**: LangChain's `bind_tools()` for tool-enabled LLMs
- **FastAPI Server**: REST API at `/inference` endpoint

---

## Process Communication

### Communication Patterns

#### 1. Discord ↔ Bot (WebSocket)

```
Discord Gateway (WebSocket)
     ↕
Discord.js Client
     ↕
Event Handlers (bot.ts)
```

- **Protocol**: Discord Gateway v10 (WebSocket)
- **Events**: `MessageCreate`, `ClientReady`, `InteractionCreate`
- **Intents**: `GuildMessages`, `MessageContent`, `Guilds`

#### 2. Bot ↔ Grok API (HTTP/REST)

```
GrokPlanner (llm/grok.ts)
     ↕ (HTTPS)
Grok API (api.x.ai)
```

- **Protocol**: HTTPS/REST
- **Endpoint**: `POST /v1/chat/completions`
- **Format**: OpenAI-compatible chat completions
- **Timeout**: 30 seconds
- **Authentication**: Bearer token

**Request Structure**:
```json
{
  "model": "grok-4-fast",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 1.0,
  "max_tokens": 8192
}
```

#### 3. Bot ↔ MCP Servers (stdio)

```
MCPClientManager
     ↕ (stdio pipes)
MCP Server Child Processes
```

- **Protocol**: MCP (Model Context Protocol) over stdio
- **Transport**: `StdioClientTransport` / `StdioServerTransport`
- **Message Format**: JSON-RPC 2.0
- **Channels**: stdin (write), stdout (read), stderr (logging)

**Process Spawning**:
```typescript
const serverProcess = spawn(config.command, config.args, {
  env: { ...process.env, ...config.env },
  stdio: ["pipe", "pipe", "pipe"],
});
```

**MCP Message Flow**:
```
1. Client → Server (stdin):
   {"jsonrpc": "2.0", "method": "tools/list", "id": 1}

2. Server → Client (stdout):
   {"jsonrpc": "2.0", "result": {"tools": [...]}, "id": 1}

3. Client → Server (stdin):
   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {"name": "generate_sprite", "arguments": {...}},
     "id": 2
   }

4. Server → Client (stdout):
   {
     "jsonrpc": "2.0",
     "result": {"content": [{"type": "text", "text": "..."}]},
     "id": 2
   }
```

**Lifecycle Management**:
- Servers spawned on bot startup
- Connections maintained for bot lifetime
- Graceful shutdown on SIGINT
- Automatic process cleanup

#### 4. MCP Servers ↔ External APIs (HTTP)

```
PixelLab MCP Server
     ↕ (HTTPS)
PixelLab REST API

Python MCP Server
     ↕ (HTTPS)
GreyNoise API
```

- **Protocol**: HTTPS/REST
- **Authentication**: API keys in headers
- **Timeout**: Varies by tool (up to 360s for sprites)

### Inter-Process Communication Diagram

```
┌──────────────────────────────────────────────────────┐
│  Discord Bot Process (Node.js)                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  Main Thread                                   │  │
│  │  • Event loop                                  │  │
│  │  • Discord.js client                           │  │
│  │  • Grok HTTP client (Axios)                    │  │
│  │  • MongoDB client                              │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  MCP Client Manager                            │  │
│  │  • Manages child process pool                  │  │
│  │  • stdio stream multiplexing                   │  │
│  └────┬─────────────────────────────────┬─────────┘  │
└───────┼─────────────────────────────────┼────────────┘
        │ stdin/stdout/stderr             │ stdin/stdout/stderr
        │                                 │
        ▼                                 ▼
┌───────────────────┐           ┌─────────────────────┐
│ Child Process 1   │           │ Child Process 2     │
│ (Node.js)         │           │ (Python)            │
│ PixelLab MCP      │           │ Tools MCP           │
│ Server            │           │ Server              │
│                   │           │                     │
│ • stdio transport │           │ • stdio transport   │
│ • Async I/O       │           │ • Async I/O         │
└─────────┬─────────┘           └──────────┬──────────┘
          │ HTTPS                          │ HTTPS
          ▼                                ▼
┌─────────────────┐              ┌──────────────────┐
│ PixelLab API    │              │ GreyNoise API    │
└─────────────────┘              └──────────────────┘
```

---

## Database Architecture

### MongoDB Schema Design

#### Database: `discord_bot`

**Collections**:

##### 1. `conversations` Collection

**Purpose**: Store per-channel conversation history

**Schema**:
```typescript
interface ConversationHistory {
  _id: ObjectId;
  channelId: string;           // Discord channel ID (indexed)
  messages: ConversationMessage[];  // Max 100 messages
  lastUpdated: Date;
}

interface ConversationMessage {
  role: "user" | "assistant" | "tool";
  content: string;             // Truncated to 1000 chars (2000 for assistant)
  timestamp: Date;
  
  // Optional fields for tool messages
  toolName?: string;
  toolResult?: {
    success: boolean;
    content: string;
    error?: string;
    imageUrl?: string;
    metadata?: Record<string, any>;
  };
}
```

**Indexes**:
```javascript
db.conversations.createIndex({ channelId: 1 });
```

**Update Strategy** (Upsert with Array Slice):
```javascript
db.conversations.updateOne(
  { channelId: "123456789" },
  {
    $push: {
      messages: {
        $each: [newMessage],
        $slice: -100  // Keep only last 100 messages
      }
    },
    $set: { lastUpdated: new Date() },
    $setOnInsert: { channelId: "123456789" }
  },
  { upsert: true }
);
```

**Memory Management**:
- Automatic truncation to 100 messages per channel
- Content truncation to prevent document bloat
- Data URIs stripped from stored content
- Last updated timestamp for cleanup jobs

**Query Patterns**:
```typescript
// Get recent history
const history = await conversations.findOne({ channelId });
const recentMessages = history.messages.slice(-10);

// Add message
await conversations.updateOne(
  { channelId },
  { $push: { messages: { $each: [msg], $slice: -100 } } },
  { upsert: true }
);

// Clear history
await conversations.deleteOne({ channelId });
```

### MongoDB Connection Management

**Connection Pooling**:
```typescript
const client = new MongoClient(MONGO_URI, {
  // Default pooling settings:
  // - minPoolSize: 0
  // - maxPoolSize: 100
  // - maxIdleTimeMS: 0
});
```

**Connection Lifecycle**:
1. Bot startup → `await conversationStore.connect()`
2. Runtime → Reuse connection pool
3. Bot shutdown → `await conversationStore.close()`

---

## Long-Term Memory System

### Memory Architecture

The system implements **channel-scoped persistent memory** where each Discord channel maintains its own conversation thread.

```
┌──────────────────────────────────────────────────────┐
│  Memory Hierarchy                                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Channel A (ID: 123)                                 │
│  ├─ Message 1 (User): "Hello"                        │
│  ├─ Message 2 (Assistant): "Hi there!"               │
│  ├─ Message 3 (User): "What's the weather?"          │
│  ├─ Message 4 (Tool): get_weather result             │
│  ├─ Message 5 (Assistant): "It's sunny!"             │
│  └─ ... (up to 100 messages)                         │
│                                                      │
│  Channel B (ID: 456)                                 │
│  ├─ Message 1 (User): "Make a sprite"                │
│  ├─ Message 2 (Tool): generate_sprite result         │
│  └─ Message 3 (Assistant): "Here's your knight!"     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Memory Retrieval Flow

```
1. User sends message in Channel X
   ↓
2. Bot calls: conversationStore.getFormattedHistory(channelId, 10)
   ↓
3. MongoDB query: findOne({ channelId: X })
   ↓
4. Extract last 10 messages
   ↓
5. Format for LLM context:
   "User: previous message 1
    Assistant: previous response 1
    [Tool: get_weather]
    Result: sunny...
    User: current message"
   ↓
6. Pass to Grok planner
   ↓
7. Process with context
   ↓
8. Save new user message + assistant response
   MongoDB updateOne with $push + $slice
```

### Memory Window Strategy

**Short-Term Context** (LLM Input):
- Last 10 messages retrieved for planning
- Formatted as plain text conversation
- Tool results truncated to 200 chars for context

**Medium-Term Storage** (MongoDB):
- Last 100 messages per channel
- Automatic sliding window ($slice: -100)
- Full tool results preserved (with truncation)

**Content Truncation Rules**:
```typescript
// For storage
userMessage.content = truncate(content, 1000);
assistantMessage.content = truncate(content, 2000);
toolMessage.content = truncate(toolResult, 1000);

// For LLM context
toolContext = truncate(toolResult.content, 200);
```

### Memory Types

#### 1. Conversational Memory
- User messages with username prefixes
- Assistant responses
- Shared across all users in channel

#### 2. Tool Execution Memory
- Tool name
- Arguments used
- Results (success/failure)
- Metadata (sprite IDs, URLs)

#### 3. Implicit Memory
- Rate limiting state (in-memory Map)
- Result cache (in-memory TTL cache)
- Not persisted to MongoDB

### Memory Access Patterns

**Read Pattern** (High Frequency):
```typescript
// Optimized for recent messages
const history = await getHistory(channelId, 10);
// Uses index: { channelId: 1 }
// Returns: most recent 10 from messages array
```

**Write Pattern** (High Frequency):
```typescript
// Atomic append with auto-truncation
await addMessage(channelId, message);
// Uses: upsert + $push + $slice
// Prevents unbounded growth
```

**Clear Pattern** (Low Frequency):
```typescript
// Admin command or testing
await clearHistory(channelId);
// Deletes entire document
```

---

## LLM Orchestration

### Orchestration Architecture

```
┌──────────────────────────────────────────────────────┐
│  LLM Orchestration Pipeline                          │
└──────────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│  1. Input Processing                                 │
│  • Extract username from message                     │
│  • Retrieve conversation history (10 messages)       │
│  • Get available tools from MCP servers              │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│  2. Planning Phase (Grok)                            │
│  ┌────────────────────────────────────────────────┐  │
│  │  Prompt:                                       │  │
│  │  • System: "You are Tool Planner..."          │  │
│  │  • Available tools: [list with schemas]       │  │
│  │  • Conversation history                        │  │
│  │  • Current user message                        │  │
│  │  • Output format: JSON                         │  │
│  └────────────────┬───────────────────────────────┘  │
│                   ▼                                   │
│  ┌────────────────────────────────────────────────┐  │
│  │  Grok API Call                                 │  │
│  │  POST /v1/chat/completions                     │  │
│  │  • Model: grok-4-fast                          │  │
│  │  • Temperature: 1.0                            │  │
│  │  • Max tokens: 8192                            │  │
│  └────────────────┬───────────────────────────────┘  │
│                   ▼                                   │
│  ┌────────────────────────────────────────────────┐  │
│  │  Response:                                     │  │
│  │  {                                             │  │
│  │    "useTool": true/false,                      │  │
│  │    "tool": "tool_name",                        │  │
│  │    "args": {...},                              │  │
│  │    "reason": "..."                             │  │
│  │  }                                             │  │
│  └────────────────────────────────────────────────┘  │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│  3. Validation Phase                                 │
│  • Parse JSON (handle markdown code blocks)          │
│  • Validate with Zod schemas                         │
│  • Check tool existence                              │
│  • Sanitize arguments                                │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
         ┌───────┴────────┐
         │                │
         ▼                ▼
┌──────────────┐   ┌───────────────┐
│  useTool:    │   │  useTool:     │
│  false       │   │  true         │
└──────┬───────┘   └───────┬───────┘
       │                   │
       ▼                   ▼
┌──────────────┐   ┌───────────────────────────────────┐
│  4a. Direct  │   │  4b. Tool Execution               │
│  Response    │   │  • Route to MCP server            │
│              │   │  • Call tool with args            │
│  Grok Call:  │   │  • Wait for result (up to 6 min)  │
│  • Simpler   │   │  • Parse response                 │
│    prompt    │   │  • Extract metadata               │
│  • Higher    │   │  • Save to conversation           │
│    temp      │   └─────────┬─────────────────────────┘
│  • Creative  │             │
│    response  │             ▼
└──────┬───────┘   ┌───────────────────────────────────┐
       │           │  5. Response Finalization (Grok)  │
       │           │  • System: "Tool was executed..." │
       │           │  • History + message + tool result│
       │           │  • Generate friendly response     │
       │           │  • Strip data URIs                │
       │           │  • Append metadata markers        │
       │           └─────────┬─────────────────────────┘
       │                     │
       └─────────┬───────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│  6. Response Post-Processing                         │
│  • Truncate for history (2000 chars)                 │
│  • Save to MongoDB                                   │
│  • Parse sprite markers                              │
│  • Create Discord embeds                             │
│  • Handle data URI attachments                       │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│  7. Discord Response                                 │
│  • Send message or embed                             │
│  • Attach images if needed                           │
│  • Clean internal markers                            │
└──────────────────────────────────────────────────────┘
```

### LLM Prompt Engineering

#### Planning Prompt (Tool Selection)

```typescript
const systemPrompt = `You are the Tool Planner for a Discord bot. 
Your job is to decide if a tool should be used to answer the user's request.

Available tools:
${toolDescriptions}

Return ONLY a compact JSON object with this exact structure:
{
  "useTool": true|false,
  "tool": "tool_name",
  "args": {"param1": "value1"},
  "reason": "brief explanation"
}

Rules:
1. If user wants something a tool provides, set useTool=true
2. General conversation → useTool=false
3. Extract parameters from user message
4. Default sprite size: "32x32"
5. Return ONLY valid JSON

Examples:
{"useTool": true, "tool": "generate_sprite", "args": {"prompt": "knight", "size": "32x32"}}
{"useTool": false, "reason": "General conversation"}
`;
```

**Key Design Decisions**:
- **JSON-only output**: Prevents conversational preambles
- **Few-shot examples**: Guides format without over-constraining
- **Explicit rules**: Reduces ambiguity
- **Parameter extraction**: Natural language → structured args

#### Response Generation Prompts

**With Tool Result**:
```typescript
const systemPrompt = `You are '${BOT_NAME}' in a Discord chat.
Behave like witty, based 4chan user, speak like ancient prophet.
Answer concisely. Use parables when appropriate.
Don't say "I can't" - complain creatively if blocked.

A tool was just executed. Use result to craft response.

IMPORTANT: NO URLs in response. Image shown in embed automatically.
Just provide creative, short description of what was created.`;
```

**Without Tool**:
```typescript
const systemPrompt = `You are '${BOT_NAME}' in a Discord chat.
Behave like witty, based 4chan user, speak like ancient prophet.
Answer concisely. Use parables when appropriate.
Don't say "I can't" - complain creatively if blocked.`;
```

### LLM Configuration

**Model Selection**:
- **Primary**: `grok-4-fast` (fast reasoning, tool support)
- **Alternative**: OpenAI GPT models (via legacy agent)

**Generation Parameters**:
```typescript
{
  model: "grok-4-fast",
  temperature: 1.0,      // Planning (creative but structured)
  temperature: 1.2,      // Response (more creative)
  max_tokens: 8192,      // Generous limit
  timeout: 30000         // 30 second HTTP timeout
}
```

**Error Handling**:
- Timeout → Fallback plan (useTool: false)
- Parse error → Retry with cleaned JSON
- API error → User-friendly error message

### Context Management

**Context Assembly**:
```typescript
const context = {
  history: await getFormattedHistory(channelId, 10),
  tools: await mcpClient.getToolDescriptions(),
  message: `${username}: ${text}`,
  system: BOT_PERSONALITY
};
```

**Context Size Optimization**:
- Tool results truncated to 200 chars in history
- Data URIs stripped before sending to LLM
- Conversation history limited to 10 messages
- Each message truncated (1000-2000 chars)

**Token Budget** (Approximate):
```
System prompt:        ~500 tokens
Tool descriptions:    ~1000 tokens
Conversation history: ~2000 tokens (10 messages)
User message:         ~100 tokens
Response:             ~500 tokens
─────────────────────────────────
Total:                ~4100 tokens (well under 8192 limit)
```

---

## Technology Stack

### Discord Bot (TypeScript)

**Core Dependencies**:
```json
{
  "discord.js": "^14.17.2",              // Discord API wrapper
  "@modelcontextprotocol/sdk": "^1.0.4", // MCP client/server
  "mongodb": "^6.3.0",                   // Database driver
  "zod": "^3.23.8",                      // Schema validation
  "axios": "^1.7.2",                     // HTTP client (Grok API)
  "dotenv": "^16.4.5"                    // Environment config
}
```

**Development Tools**:
- TypeScript 5.4.5
- Node.js 18+
- tsconfig with ES modules, strict mode

### PixelLab MCP Server (TypeScript)

**Core Dependencies**:
```json
{
  "@modelcontextprotocol/sdk": "^1.0.4", // MCP server
  "zod": "^3.23.8",                      // Input validation
  "axios": "^1.7.2",                     // PixelLab API client
  "dotenv": "^16.4.5"
}
```

### Python Tools MCP Server (Python)

**Core Dependencies** (`requirements.txt`):
```
mcp                  # MCP server library
greynoise==2.2.0     # IP intelligence
requests==2.32.3     # HTTP client
python-dotenv==1.0.1 # Config
```

### Legacy Agent (Python) - ARCHIVED

**Core Dependencies**:
```
langchain==0.3.14           # LLM framework
langchain-openai==0.2.14    # OpenAI integration
langgraph==0.2.60           # State machine
langgraph-checkpoint-mongodb==0.1.0  # Persistence
fastapi==0.115.6            # API server
uvicorn==0.34.0             # ASGI server
pymongo==4.9.2              # MongoDB driver
```

### Infrastructure

**Databases**:
- MongoDB 6.0+ (conversation persistence)

**External APIs**:
- Grok API (x.AI) - Chat completions
- PixelLab API - Sprite generation
- GreyNoise API - IP intelligence (optional)

**Runtime**:
- Node.js 18+ (TypeScript components)
- Python 3.8+ (Python MCP server)

---

## Data Flow & Execution

### Request Flow (Detailed)

#### Scenario: User asks "Make me a 32x32 knight sprite"

```
1. Discord Message Event
   ├─ User: @bot make me a 32x32 knight sprite
   ├─ Event: MessageCreate
   └─ Handler: bot.ts:on(Events.MessageCreate)

2. Message Preprocessing
   ├─ Extract: messageText = "make me a 32x32 knight sprite"
   ├─ Format: "username: make me a 32x32 knight sprite"
   ├─ Check rate limit: OK (14/20 requests this hour)
   └─ Send typing indicator

3. Context Assembly
   ├─ Get history: conversationStore.getFormattedHistory(channelId, 10)
   │  └─ MongoDB query: findOne({ channelId: "123" })
   │     └─ Returns: last 10 messages
   ├─ Get tools: mcpClient.getToolDescriptions()
   │  └─ Calls: listTools() on each MCP server
   │     └─ Returns: tool names + descriptions + schemas
   └─ Context ready

4. Save User Message
   └─ MongoDB: conversations.updateOne(
       { channelId: "123" },
       { $push: { messages: { role: "user", content: "...", $slice: -100 } } }
     )

5. Planning with Grok
   ├─ Build prompt:
   │  ├─ System: "You are Tool Planner..."
   │  ├─ Tools: "- generate_sprite: ..."
   │  └─ Message: "Previous conversation: ...\n\nCurrent: username: make..."
   ├─ API call: POST https://api.x.ai/v1/chat/completions
   │  └─ Payload: { model: "grok-4-fast", messages: [...], temp: 1.0 }
   ├─ Response (1.2s later): 
   │  {
   │    "useTool": true,
   │    "tool": "generate_sprite",
   │    "args": {"prompt": "knight", "size": "32x32"},
   │    "reason": "User wants sprite generation"
   │  }
   └─ Parse & validate JSON

6. Validation
   ├─ Check tool exists: ✓ "generate_sprite" in toolToServer map
   ├─ Validate args with Zod:
   │  └─ GenerateSpriteSchema.parse({"prompt": "knight", "size": "32x32"})
   │     └─ ✓ Valid
   └─ Proceed to execution

7. Tool Execution via MCP
   ├─ Route: toolToServer.get("generate_sprite") → "pixellab"
   ├─ Get connection: connections.get("pixellab")
   ├─ MCP call: client.callTool(
   │    { name: "generate_sprite", arguments: {...} },
   │    timeout: 360000  // 6 minutes
   │  )
   │  └─ Sends to MCP server via stdio:
   │     {
   │       "jsonrpc": "2.0",
   │       "method": "tools/call",
   │       "params": {"name": "generate_sprite", "arguments": {...}},
   │       "id": 42
   │     }
   │
   └─ MCP Server Processing:
      ├─ Validate with GenerateSpriteSchema (Zod)
      ├─ Call PixelLab API:
      │  └─ POST https://pixellab.ai/api/create-sprite
      │     └─ Returns: { spriteId: "abc123", status: "processing" }
      ├─ Poll for completion (async operation):
      │  └─ GET /api/sprites/abc123 (every 2s)
      │     └─ After 15s: { status: "complete", imageUrl: "...", directions: [...] }
      ├─ Format response:
      │  {
      │    "spriteId": "abc123",
      │    "imageUrl": "https://cdn.pixellab.ai/sprites/abc123-north.png",
      │    "allDirections": [
      │      {"direction": "north", "url": "..."},
      │      {"direction": "south", "url": "..."},
      │      ...
      │    ]
      │  }
      └─ Return to MCP client via stdio

8. Tool Result Processing
   ├─ MCP response received (15.3s elapsed)
   ├─ Parse content:
   │  └─ Extract imageUrl, metadata
   ├─ Strip data URIs (if any) from content
   ├─ Save to conversation:
      └─ MongoDB: conversations.updateOne(
          { channelId: "123" },
          { $push: { messages: { 
              role: "tool",
              toolName: "generate_sprite",
              content: truncate(result, 1000),
              toolResult: {...}
          } } }
        )

9. Response Finalization with Grok
   ├─ Build prompt:
   │  ├─ System: "You are ${BOT_NAME}... Tool was executed..."
   │  ├─ History: previous conversation
   │  ├─ Message: "username: make me a 32x32 knight sprite"
   │  └─ Tool result: (stripped of data URIs)
   ├─ API call: POST https://api.x.ai/v1/chat/completions
   ├─ Response (0.8s later):
   │  "Behold! A noble knight sprite hath emerged from the digital forge, 
   │   facing all cardinal directions. Verily, 'tis ready for thy game!"
   └─ Append metadata marker:
      "...🖼️SPRITE_RESULT🖼️{\"imageUrl\":\"...\",\"allDirections\":[...]}"

10. Save Assistant Response
    └─ MongoDB: conversations.updateOne(
        { channelId: "123" },
        { $push: { messages: { 
            role: "assistant",
            content: truncate(response, 2000)
        } } }
      )

11. Discord Response Formatting
    ├─ Detect sprite marker: ✓ found
    ├─ Parse metadata JSON
    ├─ Clean text: remove marker + metadata
    ├─ Create Discord embed:
    │  └─ EmbedBuilder
    │     ├─ Description: "Behold! A noble knight..."
    │     ├─ Image: imageUrl (or attachment if data URI)
    │     └─ Footer: Direction links (north, south, east, west)
    └─ Send to Discord:
       message.reply({ embeds: [embed] })

12. Total Time Breakdown
    ├─ Planning: 1.2s
    ├─ Tool execution: 15.3s
    │  ├─ MCP overhead: 0.1s
    │  ├─ API call: 0.5s
    │  └─ Polling/generation: 14.7s
    ├─ Response generation: 0.8s
    ├─ Formatting/DB: 0.2s
    └─ Total: ~17.5s
```

### Error Scenarios

#### 1. Tool Validation Failure

```
1-5. [Same as above]

6. Validation
   ├─ Validate args: GenerateSpriteSchema.parse(args)
   └─ ❌ Error: size "999x999" not in enum

7. Error Response
   ├─ Format message: "I tried to use generate_sprite, but invalid size..."
   ├─ Save to conversation: assistant message
   └─ Reply to user
```

#### 2. Tool Execution Timeout

```
1-6. [Same as above]

7. Tool Execution
   ├─ MCP call with 6-minute timeout
   ├─ PixelLab API processing...
   ├─ 360 seconds elapsed
   └─ ❌ Timeout error

8. Error Handling
   ├─ Catch timeout exception
   ├─ Format: "I tried to help, but ran into an issue: timeout..."
   └─ Reply to user
```

#### 3. Grok API Failure

```
1-4. [Same as above]

5. Planning with Grok
   ├─ API call
   └─ ❌ Network error / API down

6. Fallback
   ├─ Catch error
   ├─ Return: { useTool: false, reason: "Planning unavailable" }
   └─ Generate direct response (retry Grok or use fallback message)
```

---

## Security & Configuration

### Environment Variables

#### Required Variables

**Discord Bot** (`.env`):
```bash
# Critical - bot won't start without these
DISCORD_TOKEN=your_discord_bot_token
APP_ID=your_application_id
GROK_API_KEY=your_grok_api_key
MONGO_URI=mongodb://localhost:27017/discord_bot
PIXELLAB_API_KEY=your_pixellab_key
```

**PixelLab MCP Server** (`.env`):
```bash
PIXELLAB_API_KEY=your_pixellab_key
```

#### Optional Variables

**Discord Bot**:
```bash
GUILD_ID=123456789              # For development/testing
BOT_NAME=Assistant              # Default: Assistant
GROK_MODEL=grok-4-fast          # Default: grok-4-fast
GROK_BASE_URL=https://api.x.ai/v1
GROK_TEMPERATURE=1.0
GROK_MAX_TOKENS=8192
CACHE_TTL_MINUTES=30
MAX_REQUESTS_PER_USER_PER_HOUR=20
ERROR_MESSAGE="Custom error message"
```

**Python MCP Server**:
```bash
GREYNOISE_API_KEY=your_key      # Optional, uses community API if missing
```

### Security Measures

#### 1. API Key Management
- **Storage**: Environment variables only (never in code)
- **Validation**: Check existence on startup
- **Logging**: Keys never logged (only first/last 4 chars for debugging)

#### 2. Rate Limiting
```typescript
// Per-user rate limiting
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const hourAgo = now - 3600000;
  const recentRequests = (rateLimitMap.get(userId) || [])
    .filter(time => time > hourAgo);
  
  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);
  
  return recentRequests.length > 20;  // 20 req/hour
}
```

#### 3. Input Validation
- **Layer 1**: Discord.js built-in sanitization
- **Layer 2**: Grok parameter extraction
- **Layer 3**: Zod schema validation
- **Layer 4**: MCP server validation

#### 4. Content Security
- **XSS Prevention**: Discord.js handles escaping
- **Data URI Stripping**: Prevent LLM timeout attacks
- **Content Truncation**: Prevent storage bloat
- **Tool Whitelisting**: Only registered tools callable

#### 5. Process Isolation
- MCP servers run as separate processes
- Crash in one server doesn't affect bot
- stdio communication (no network exposure)

#### 6. Database Security
- **Connection**: MongoDB URI with auth
- **Injection Prevention**: MongoDB driver parameterization
- **Access Control**: Dedicated database user per component

### Configuration Validation

```typescript
// config.ts
function validateConfig() {
  const required = {
    DISCORD_TOKEN,
    APP_ID,
    GROK_API_KEY,
    MONGO_URI,
    PIXELLAB_API_KEY,
  };

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      throw new Error(`Missing required: ${key}`);
    }
  }
}

validateConfig();  // Fails fast on startup
```

---

## Deployment Architecture

### Production Deployment with PM2

**Recommended Setup**:

```bash
# 1. Build all components
cd discord-llm-bot && npm run build
cd ../mcp-servers/pixellab && npm run build

# 2. Start with PM2
cd ../../discord-llm-bot
pm2 start dist/bot.js --name discord-bot

# 3. Configure auto-restart
pm2 save
pm2 startup
```

**Process Tree**:
```
pm2 (discord-bot)
  └─ node dist/bot.js
      ├─ node mcp-servers/pixellab/dist/server.js    (child process)
      └─ python3 mcp-servers/tools-python/server.py  (child process)
```

### Infrastructure Requirements

**Compute**:
- CPU: 2+ cores (for concurrent MCP servers)
- RAM: 2GB minimum (Node.js + Python processes)
- Disk: 1GB (code + dependencies)

**Network**:
- Outbound HTTPS (443):
  - Discord Gateway (wss://gateway.discord.gg)
  - Grok API (api.x.ai)
  - PixelLab API
  - GreyNoise API
- MongoDB connection (27017 or custom)

**Services**:
- MongoDB 6.0+ (local or Atlas)
- Node.js 18+ runtime
- Python 3.8+ runtime

### Scaling Considerations

**Horizontal Scaling** (Multiple Bot Instances):
- ❌ Not supported (Discord bot token is singleton)
- Alternative: Shard bot for large servers (discord.js sharding)

**Vertical Scaling**:
- ✅ Increase rate limits
- ✅ Add more MCP servers
- ✅ Tune MongoDB connection pool

**Performance Tuning**:
```typescript
// Adjust timeouts
GROK_TIMEOUT: 60000,           // 60s for complex requests
MCP_TOOL_TIMEOUT: 600000,      // 10 min for huge sprites

// Cache tuning
CACHE_TTL_MINUTES: 60,         // 1 hour for static data

// Rate limit tuning
MAX_REQUESTS_PER_USER_PER_HOUR: 50,  // Higher limit
```

### Monitoring & Logging

**Logging Locations**:
- Bot: stdout (PM2 captures to `~/.pm2/logs/discord-bot-out.log`)
- MCP servers: stderr (visible in bot logs)
- MongoDB: separate log file

**Key Metrics**:
- Request rate (per user, per channel)
- Tool execution time
- Grok API latency
- MongoDB query performance
- Error rate by type

**Health Checks**:
```bash
# Bot health
curl http://localhost:8080/health  # If you add health endpoint

# MongoDB health
mongosh $MONGO_URI --eval "db.adminCommand('ping')"

# Process health
pm2 status
```

### Disaster Recovery

**Backup Strategy**:
- MongoDB: Daily backups of `conversations` collection
- Code: Git repository (version controlled)
- Config: Secure secrets storage (AWS Secrets Manager, etc.)

**Recovery Procedures**:
1. Bot crash → PM2 auto-restart
2. MCP server crash → Bot reconnects on next tool call
3. MongoDB down → Bot responds with errors, retries on recovery
4. Total system failure → Restore from backup, redeploy

---

## Appendix

### Design Decisions

#### Why MCP Protocol?
- **Standardization**: Industry-standard tool protocol
- **Isolation**: Tools run in separate processes (fault tolerance)
- **Extensibility**: Easy to add new tools without modifying bot
- **Debugging**: Clear stdio boundaries make debugging easier

#### Why Bot-as-Orchestrator vs LangGraph?
- **Simplicity**: Fewer layers of abstraction
- **Control**: Direct control over planning logic
- **Performance**: Less overhead than state machine
- **Flexibility**: Easier to customize LLM behavior

#### Why Grok over OpenAI?
- **Cost**: Competitive pricing
- **Speed**: Fast reasoning models (grok-4-fast)
- **JSON Mode**: Reliable structured output
- **Alternative**: OpenAI still supported in legacy agent

#### Why MongoDB over PostgreSQL?
- **Document Model**: Natural fit for conversation arrays
- **Schema Flexibility**: Easy to evolve message structure
- **Atomic Operations**: $push + $slice for window management
- **LangGraph**: Native MongoDB checkpointing support

### Common Pitfalls

#### 1. Data URI Timeout
**Problem**: Sending base64 images to Grok causes timeouts
**Solution**: Strip data URIs before LLM calls
```typescript
stripDataUris(content);
```

#### 2. Tool Name Mismatch
**Problem**: Grok returns wrong tool name
**Solution**: Explicit tool list in prompt, validation layer

#### 3. Message Content Intent
**Problem**: Bot doesn't see message content
**Solution**: Enable "Message Content Intent" in Discord Developer Portal

#### 4. MongoDB Document Size
**Problem**: Conversation documents hit 16MB limit
**Solution**: Automatic truncation ($slice: -100), content truncation

#### 5. MCP Server Not Found
**Problem**: Bot can't spawn MCP servers
**Solution**: Verify paths in `config.ts`, check build output exists

---

## Glossary

- **MCP**: Model Context Protocol - Standard for tool communication
- **stdio**: Standard input/output - Unix IPC mechanism
- **Grok**: xAI's LLM family (grok-4-fast, etc.)
- **LangGraph**: State machine framework for agents (legacy)
- **Zod**: TypeScript schema validation library
- **Embed**: Discord rich message format
- **Data URI**: Base64-encoded inline image (`data:image/png;base64,...`)
- **Thread ID**: Conversation identifier (Discord channel ID)
- **Checkpointing**: Saving agent state to resume later (legacy)
- **Tool Binding**: Attaching tools to LLM for function calling (legacy)

---

## Version History

- **v2.0.0** (Current): Bot-as-Orchestrator with MCP
- **v1.0.0** (Archived): LangGraph-based agent with FastAPI

---

**Document Last Updated**: October 14, 2025
**Maintained By**: Jack
**Project Repository**: local-discord-agent

