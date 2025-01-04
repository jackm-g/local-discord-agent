import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { LLMRequest, DiscordRequest } from './utils.js';
const discord_token = process.env.DISCORD_TOKEN;

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(discord_token);

client.on(Events.MessageCreate, async message => {
  if (message.mentions.has(client.user.id)) {
    const username = message.author.username;
    const message_text = message.content.replace(`<@${client.user.id}>`, `${username}:`);
    console.log(message_text);
    const response = await LLMRequest({
      method: 'POST',
      body: {
        message: message_text,
      },
    });
    message.reply(response.ai_response);
  }
});