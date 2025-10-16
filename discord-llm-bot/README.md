# Discord LLM Bot

A Discord bot that connects to the refactored ChatGPT agent API, providing intelligent conversational responses with per-channel conversation persistence.

## Features

- 🤖 **ChatGPT Integration**: Connects to the refactored `basicagent` API powered by GPT-4o-mini
- 💬 **Conversation Persistence**: All users in a Discord channel share the same conversation thread that persists across sessions
- 🔄 **Auto-Retry Logic**: Automatically retries failed requests with exponential backoff
- 💭 **Typing Indicator**: Shows typing status while waiting for the agent's response
- 🏥 **Health Checks**: Verifies agent connectivity on startup
- ⚠️ **Error Handling**: Graceful error handling with user-friendly messages
- 📝 **Detailed Logging**: Comprehensive logging for debugging and monitoring

## Architecture

```
Discord User Message
        ↓
   Discord Bot (app.js)
        ↓
   HTTP Request (utils.js)
        ↓
   FastAPI Agent (basicagent)
        ↓
   ChatGPT API (gpt-4o-mini)
        ↓
   Response back to Discord
```

## Prerequisites

- Node.js 18.x or higher
- Discord Bot Token and Application ID
- Running instance of the `basicagent` API (see ../basicagent/README.md)

## Setup

### 1. Install Dependencies

```bash
cd discord-llm-bot
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `discord-llm-bot` directory:

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
APP_ID=your_discord_application_id_here
GUILD_ID=your_discord_guild_id_here

# Bot Settings
BOT_NAME=Assistant

# Agent Configuration
AGENT_URL=http://localhost:8995

# Error Handling (optional)
ERROR_MESSAGE=I'm having trouble connecting to my knowledge base right now. Please try again in a moment! 🙏
```

### 3. Set Up Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select an existing one
3. Go to the "Bot" section and create a bot
4. Copy the bot token and add it to your `.env` file as `DISCORD_TOKEN`
5. Under "Privileged Gateway Intents", enable:
   - ✅ Message Content Intent
   - ✅ Server Members Intent (optional)
6. Copy the Application ID from "General Information" and add it to `.env` as `APP_ID`
7. Invite the bot to your server using OAuth2 URL Generator:
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Read Messages/View Channels`, `Read Message History`

### 4. Start the Agent

Make sure the `basicagent` API is running:

```bash
cd ../basicagent
python main.py
```

The agent should be running at `http://localhost:8995` (or your configured `AGENT_URL`).

### 5. Start the Discord Bot

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

## Usage

### Mention the Bot

Simply mention the bot in any channel it has access to:

```
@YourBot What is the weather in San Francisco?
```

The bot will:
1. Show a typing indicator
2. Send your message to the agent with the channel ID as the thread_id
3. Reply with the agent's response

### Conversation Persistence

Each Discord channel has its own shared conversation thread identified by `discord_channel_${channelId}`. This means:
- The agent remembers context from previous messages in the channel
- All users in a channel contribute to and see the same conversation history
- Different channels have independent conversations
- Conversation history persists across bot restarts (stored in the agent's MongoDB)

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | ✅ Yes | - | Your Discord bot token |
| `APP_ID` | ✅ Yes | - | Your Discord application ID |
| `GUILD_ID` | ⚠️ Optional | - | Your Discord server ID (for guild commands) |
| `BOT_NAME` | No | `Assistant` | Name displayed in logs |
| `AGENT_URL` | No | `http://localhost:8995` | URL of the agent API |
| `ERROR_MESSAGE` | No | Default message | Custom error message shown to users |

### Retry Configuration

The bot automatically retries failed requests:
- **Max Retries**: 3 attempts
- **Backoff Strategy**: Exponential (2^attempt seconds)
- **Retry Conditions**: Only retries on 5xx server errors, not 4xx client errors

## API Integration

### Request Format

The bot sends requests to the agent in this format:

```json
{
  "message": "username: user's message here",
  "thread_id": "discord_channel_123456789"
}
```

Note: Messages are prefixed with the username so the agent knows who is speaking, but all users in the channel share the same conversation history.

### Response Format

Expected response from the agent:

```json
{
  "ai_response": "The agent's response text",
  "thread_id": "discord_channel_123456789"
}
```

## Error Handling

The bot handles various error scenarios:

### Agent Not Available
If the agent health check fails on startup, you'll see:
```
❌ Agent health check failed: Connection refused
   Please ensure the agent is running at: http://localhost:8995
```

**Solution**: Start the `basicagent` API server.

### Request Timeout
If requests take too long, the bot will retry up to 3 times with exponential backoff.

### User-Facing Errors
Users see the configured `ERROR_MESSAGE` instead of technical error details.

## Logging

The bot provides detailed console logging:

```
✅ Discord Bot Ready!
   Logged in as: YourBot#1234
   Bot Name: Assistant
🔍 Checking agent health...
✅ Agent is healthy and ready!
📨 Message from username (123456789): What's the weather?
✅ Response sent to username
```

## Development

### File Structure

```
discord-llm-bot/
├── src/
│   ├── bot.ts           # Main bot application (TypeScript)
│   ├── config.ts        # Configuration loader
│   ├── types.ts         # TypeScript type definitions
│   ├── llm/
│   │   └── grok.ts      # Grok LLM integration
│   ├── mcp/
│   │   └── client.ts    # MCP (Model Context Protocol) client
│   ├── storage/
│   │   ├── mongo.ts     # MongoDB conversation storage
│   │   └── cache.ts     # Result caching
│   └── validation/
│       └── schemas.ts   # Input validation schemas
├── app.js           # Legacy bot application
├── utils.js         # Utility functions (HTTP requests, health checks)
├── package.json     # Dependencies and scripts
├── tsconfig.json    # TypeScript configuration
└── README.md        # This file
```

### Key Functions

**app.js:**
- `Events.ClientReady` - Bot initialization and health check
- `Events.MessageCreate` - Message handling with mentions

**utils.js:**
- `LLMRequest(options, retries)` - Send requests to agent with retry logic
- `checkAgentHealth()` - Verify agent is running and healthy
- `DiscordRequest(endpoint, options)` - Make Discord API requests

### Adding New Features

#### Custom Message Handling

Modify the message handler in `src/bot.ts` to add custom logic before processing messages:

```typescript
client.on(Events.MessageCreate, async (message: Message) => {
  // Add your custom logic here before processing
  if (message.author.bot) return;
  if (!message.mentions.has(client.user!.id)) return;
  // ... existing message processing
});
```

## Troubleshooting

### Bot doesn't respond to mentions

**Check:**
1. ✅ Message Content Intent is enabled in Discord Developer Portal
2. ✅ Bot has permission to read and send messages in the channel
3. ✅ You're actually mentioning the bot (should be blue)
4. ✅ The agent API is running (`npm start` in basicagent directory)

### "Agent health check failed"

**Solutions:**
1. Start the agent: `cd ../basicagent && python main.py`
2. Verify the agent is running: `curl http://localhost:8995/health`
3. Check `AGENT_URL` in your `.env` file matches the agent's address

### Bot connects but no response

**Check:**
1. Look at the bot's console logs for error messages
2. Check the agent's console logs for incoming requests
3. Verify MongoDB is running (required by the agent)
4. Test the agent directly: `curl -X POST http://localhost:8995/inference -H "Content-Type: application/json" -d '{"message": "test"}'`

### High latency / slow responses

**Potential causes:**
1. ChatGPT API latency (typically 1-3 seconds)
2. Tool execution in the agent (GreyNoise, weather, etc.)
3. MongoDB query performance
4. Network latency to OpenAI

**Solutions:**
- Monitor agent logs for timing information
- Consider using a faster model (though gpt-4o-mini is already fast)
- Optimize MongoDB queries/indexing

## Production Deployment

### Recommended Setup

1. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start app.js --name discord-bot
   pm2 save
   pm2 startup
   ```

2. **Environment-specific configuration:**
   - Use different `.env` files for dev/prod
   - Set `AGENT_URL` to your production agent URL
   - Configure monitoring and logging

3. **Monitoring:**
   - Monitor bot uptime
   - Track API response times
   - Set up alerts for errors

4. **Security:**
   - Never commit `.env` files
   - Use secrets management (AWS Secrets Manager, etc.)
   - Restrict bot permissions to minimum required

## Contributing

When making changes:
1. Test locally with a development Discord server
2. Check both bot and agent logs
3. Test error scenarios (agent down, network issues, etc.)
4. Update this README if adding new features

## Related Documentation

- [Basic Agent README](../basicagent/README.md) - Agent API documentation
- [Discord.js Guide](https://discordjs.guide/) - Discord.js documentation
- [Discord Developer Portal](https://discord.com/developers/docs) - Discord API documentation

## License

Part of the local-discord-agent repository.

