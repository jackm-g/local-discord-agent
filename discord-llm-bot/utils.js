import 'dotenv/config';

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  
  // Only stringify body if it exists and method is not GET or HEAD
  if (options.body && !['GET', 'HEAD'].includes(options.method?.toUpperCase())) {
    options.body = JSON.stringify(options.body);
  } else if (['GET', 'HEAD'].includes(options.method?.toUpperCase())) {
    // Remove body for GET/HEAD requests
    delete options.body;
  }
  
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot, 1.0.0)',
    },
    ...options
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function LLMRequest(options, retries = 3) {
  const baseUrl = process.env.AGENT_URL || 'http://localhost:8995';
  const url = `${baseUrl}/inference`;
  
  options.body = JSON.stringify(options.body);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8'
        },
        ...options
      });

      if (!res.ok) {
        const data = await res.json();
        console.error(`LLM Request failed (attempt ${attempt}/${retries}):`, res.status, data);
        
        // Don't retry on client errors (4xx), only server errors (5xx)
        if (res.status < 500) {
          throw new Error(`Agent returned error: ${data.error || 'Unknown error'}`);
        }
        
        if (attempt === retries) {
          throw new Error(`Agent returned error after ${retries} attempts: ${data.error || 'Unknown error'}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      return await res.json();
    } catch (err) {
      if (attempt === retries) {
        console.error('LLM Request failed after all retries:', err.message);
        throw err;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

export async function checkAgentHealth() {
  const baseUrl = process.env.AGENT_URL || 'http://localhost:8995';
  const url = `${baseUrl}/health`;
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      return { healthy: false, error: `Health check returned status ${res.status}` };
    }
    
    const data = await res.json();
    return { healthy: data.status === 'healthy', data };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}

export async function InstallGuildCommands(appId, guildId, commands) {
  const url = `applications/${appId}/guilds/${guildId}/commands`;
  try {
    await DiscordRequest(url, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = ['😭','😄','😌','🤓','😎','😤','🤖','😶‍🌫️','🌏','📸','💿','👋','🌊','✨'];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
