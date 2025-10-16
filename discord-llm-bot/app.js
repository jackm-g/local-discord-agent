import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { LLMRequest, checkAgentHealth } from './utils.js';

const discord_token = process.env.DISCORD_TOKEN;
const bot_name = process.env.BOT_NAME || 'Assistant';

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async readyClient => {
  console.log('='.repeat(60));
  console.log(`✅ Discord Bot Ready!`);
  console.log(`   Logged in as: ${readyClient.user.tag}`);
  console.log(`   Bot Name: ${bot_name}`);
  console.log('='.repeat(60));
  
  // Check agent health on startup
  console.log('🔍 Checking agent health...');
  const health = await checkAgentHealth();
  if (health.healthy) {
    console.log('✅ Agent is healthy and ready!');
  } else {
    console.error('❌ Agent health check failed:', health.error);
    console.error('   Please ensure the agent is running at:', process.env.AGENT_URL || 'http://localhost:8995');
  }
  console.log('='.repeat(60));
});

// Log in to Discord with your client's token
client.login(discord_token);

client.on(Events.MessageCreate, async message => {
  // Ignore messages from bots
  if (message.author.bot) return;
  
  // Only respond when mentioned
  if (message.mentions.has(client.user.id)) {
    const username = message.author.username;
    const user_id = message.author.id;
    
    // Remove the mention and prepend with username for context
    const message_text = message.content
      .replace(`<@${client.user.id}>`, '')
      .trim();
    
    const formatted_message = `${username}: ${message_text}`;
    
    console.log(`📨 Message from ${username} (${user_id}): ${message_text}`);
    
    try {
      // Start typing indicator
      await message.channel.sendTyping();
      
      // Send to agent with channel-specific thread_id for shared conversation history
      const response = await LLMRequest({
        method: 'POST',
        body: {
          message: formatted_message,
          thread_id: `discord_channel_${message.channel.id}`, // Unique thread per channel (shared by all users)
        },
      });
      
      console.log(`✅ Response sent to ${username}`);
      
      // Reply with the AI response
      await message.reply(response.ai_response);
      
    } catch (err) {
      console.error(`❌ Error processing message from ${username}:`, err.message);
      
      // Send user-friendly error message
      const errorMessage = process.env.ERROR_MESSAGE || 
        "I'm having trouble connecting to my knowledge base right now. Please try again in a moment! 🙏";
      
      try {
        await message.reply(errorMessage);
      } catch (replyErr) {
        console.error('Failed to send error message to user:', replyErr.message);
      }
    }
  }
});