#!/usr/bin/env node

/**
 * Discord Bot Orchestrator
 * Coordinates Grok planning, MCP tool execution, and Discord interactions
 */
import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";
import { MCPClientManager } from "./mcp/client.js";
import { GrokPlanner } from "./llm/grok.js";
import { ConversationStore } from "./storage/mongo.js";
import { ResultCache, startCacheCleanup } from "./storage/cache.js";
import { validateToolArgs } from "./validation/schemas.js";
import { ConversationMessage } from "./types.js";
import {
  DISCORD_TOKEN,
  BOT_NAME,
  MCP_SERVERS,
  ERROR_MESSAGE,
} from "./config.js";

// Initialize components
const mcpClient = new MCPClientManager();
const grokPlanner = new GrokPlanner();
const conversationStore = new ConversationStore();
const resultCache = new ResultCache();

// Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Rate limiting map (userId -> request timestamps)
const rateLimitMap = new Map<string, number[]>();

/**
 * Check if user is rate limited
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  // Get recent requests
  const requests = rateLimitMap.get(userId) || [];
  const recentRequests = requests.filter((time) => time > hourAgo);

  // Update map
  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);

  // Check limit (20 per hour)
  return recentRequests.length > 20;
}

/**
 * Process a user message and generate response
 */
async function processMessage(
  message: string,
  channelId: string,
  userId: string,
  username: string
): Promise<string> {
  // Check rate limit
  if (checkRateLimit(userId)) {
    return "Slow down there, friend! You've hit the rate limit. Try again in a bit. 🐢";
  }

  // Get conversation history
  const historyText = await conversationStore.getFormattedHistory(channelId, 10);

  // Get tool descriptions
  const toolDescriptions = await mcpClient.getToolDescriptions();

  // Format user message with username
  const formattedMessage = `${username}: ${message}`;

  // Save user message to history
  const userMsg: ConversationMessage = {
    role: "user",
    content: formattedMessage,
    timestamp: new Date(),
  };
  await conversationStore.addMessage(channelId, userMsg);

  // Plan with Grok
  console.log(`🤔 Planning response for: ${formattedMessage}`);
  const plan = await grokPlanner.planTool(formattedMessage, historyText, toolDescriptions);

  console.log(`📋 Plan:`, plan);

  let response: string;

  if (plan.useTool && plan.tool && plan.args) {
    // Validate tool arguments
    const validation = validateToolArgs(plan.tool, plan.args);

    if (!validation.valid) {
      response = `I tried to use the \`${plan.tool}\` tool, but something went wrong with the parameters: ${validation.error}\n\nCould you rephrase your request?`;
    } else {
      // Execute tool via MCP (no caching for sprite operations)
      console.log(`🔧 Executing tool: ${plan.tool}`);
      const toolResult = await mcpClient.callTool(plan.tool, validation.data);

      // Save tool result to history
      const toolMsg: ConversationMessage = {
        role: "tool",
        content: truncateForHistory(toolResult.content || toolResult.error || "No result"),
        timestamp: new Date(),
        toolName: plan.tool,
        toolResult: {
          ...toolResult,
          content: truncateForHistory(toolResult.content || ""),
          error: toolResult.error ? truncateForHistory(toolResult.error) : undefined,
        },
      };
      await conversationStore.addMessage(channelId, toolMsg);

      if (toolResult.success) {
        // Generate friendly response with tool result
        // Strip data URIs to prevent timeout when sending to Grok API
        response = await grokPlanner.finalizeResponse(
          formattedMessage,
          stripDataUris(toolResult.content),
          historyText
        );

        // Append metadata marker for embed processing
        if (toolResult.imageUrl || toolResult.metadata) {
          // Flatten the nested metadata structure properly
          const flatMetadata: any = {
            imageUrl: toolResult.imageUrl,
          };
          
          // If metadata exists, merge it but avoid double-nesting
          if (toolResult.metadata) {
            const metadata = toolResult.metadata;
            // Copy top-level fields
            Object.keys(metadata).forEach(key => {
              if (key !== 'metadata') {
                flatMetadata[key] = metadata[key];
              }
            });
            
            // If there's a nested metadata, merge those fields too
            if (metadata.metadata) {
              Object.keys(metadata.metadata).forEach(key => {
                flatMetadata[key] = metadata.metadata![key];
              });
            }
          }
          
          // Use different markers for different image types
          if (plan.tool === "generate_image") {
            response += `\n\n🖼️XAI_IMAGE_RESULT🖼️${JSON.stringify(flatMetadata)}`;
          } else {
            response += `\n\n🖼️SPRITE_RESULT🖼️${JSON.stringify(flatMetadata)}`;
          }
        }
      } else {
        response = `I tried to help, but ran into an issue: ${toolResult.error}\n\nThe prophecy remains unclear... 🔮`;
      }
    }
  } else {
    // No tool needed, generate direct response
    console.log(`💬 Generating direct response`);
    response = await grokPlanner.generateResponse(formattedMessage, historyText);
  }

  // Save assistant response to history (truncated to prevent massive history)
  const assistantMsg: ConversationMessage = {
    role: "assistant",
    content: truncateForHistory(response, 2000), // Allow longer for assistant responses
    timestamp: new Date(),
  };
  await conversationStore.addMessage(channelId, assistantMsg);

  return response;
}

/**
 * Helper to truncate long content for history
 */
function truncateForHistory(content: string, maxLength: number = 1000): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + `... (truncated ${content.length - maxLength} chars)`;
}

/**
 * Helper to remove or truncate data URIs from content
 * This prevents timeouts when sending large base64 data to LLMs
 */
function stripDataUris(content: string): string {
  // Replace data URIs with placeholders
  return content.replace(
    /data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/g,
    (match) => {
      const size = Math.round(match.length / 1024);
      return `[EMBEDDED]`;
    }
  );
}

/**
 * Helper to remove image result markers from user-facing content
 * These markers are for internal parsing only
 */
function cleanSpriteMarkers(content: string): string {
  const spriteMarker = "🖼️SPRITE_RESULT🖼️";
  const xaiImageMarker = "🖼️XAI_IMAGE_RESULT🖼️";
  
  // Find the first occurrence of either marker
  const spriteIndex = content.indexOf(spriteMarker);
  const xaiIndex = content.indexOf(xaiImageMarker);
  
  let firstMarkerIndex = -1;
  if (spriteIndex !== -1 && xaiIndex !== -1) {
    firstMarkerIndex = Math.min(spriteIndex, xaiIndex);
  } else if (spriteIndex !== -1) {
    firstMarkerIndex = spriteIndex;
  } else if (xaiIndex !== -1) {
    firstMarkerIndex = xaiIndex;
  }
  
  if (firstMarkerIndex === -1) {
    return content;
  }
  
  // Remove everything from the first marker onward
  return content.substring(0, firstMarkerIndex).trim();
}

/**
 * Bot ready event
 */
client.once(Events.ClientReady, async (readyClient) => {
  console.log("=".repeat(60));
  console.log(`✅ Discord Bot Ready!`);
  console.log(`   Logged in as: ${readyClient.user.tag}`);
  console.log(`   Bot Name: ${BOT_NAME}`);
  console.log("=".repeat(60));

  try {
    // Initialize MongoDB
    await conversationStore.connect();

    // Initialize MCP servers
    await mcpClient.initialize(MCP_SERVERS);

    // Clear cache on startup to ensure fresh data with latest code changes
    resultCache.clear();
    console.log("🧹 Cache cleared on startup");

    // Start cache cleanup
    startCacheCleanup(resultCache);

    console.log("✅ All systems ready!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Failed to initialize:", error);
    process.exit(1);
  }
});

/**
 * Handle mentions in messages
 */
client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only respond when mentioned
  if (!message.mentions.has(client.user!.id)) return;

  const username = message.author.username;
  const userId = message.author.id;
  const channelId = message.channel.id;

  // Remove mention and get message text
  const messageText = message.content.replace(`<@${client.user!.id}>`, "").trim();

  if (!messageText) {
    await message.reply("Yes? How may I enlighten you? 🔮");
    return;
  }

  console.log(`📨 Message from ${username} (${userId}): ${messageText}`);

  try {
    // Start typing indicator
    if ("sendTyping" in message.channel) {
      await message.channel.sendTyping();
    }

    // Set up a "still processing" notification after 30 seconds
    let longRunningNotification: NodeJS.Timeout | null = null;
    let notificationMessage: any = null;
    
    longRunningNotification = setTimeout(async () => {
      try {
        notificationMessage = await message.reply("🎨 Generating your sprite... This might take a minute for larger images. Please wait! ⏳");
      } catch (err) {
        console.error("Failed to send long-running notification:", err);
      }
    }, 30000); // 30 seconds

    // Process message
    const response = await processMessage(messageText, channelId, userId, username);

    // Clear the notification timeout if processing finished quickly
    if (longRunningNotification) {
      clearTimeout(longRunningNotification);
    }

    // Delete the "still processing" message if it was sent
    if (notificationMessage) {
      try {
        await notificationMessage.delete();
      } catch (err) {
        console.error("Failed to delete notification message:", err);
      }
    }

    console.log(`✅ Response sent to ${username}`);

    // Check if response contains sprite result metadata
    // Use a more robust regex that handles multiline JSON
    const spriteMarker = "🖼️SPRITE_RESULT🖼️";
    const spriteIndex = response.lastIndexOf(spriteMarker); // Use last occurrence
    
    // Check if response contains X.AI image result metadata
    const xaiImageMarker = "🖼️XAI_IMAGE_RESULT🖼️";
    const xaiImageIndex = response.lastIndexOf(xaiImageMarker);
    
    // Check X.AI images first (takes priority over sprite embeds)
    if (xaiImageIndex !== -1) {
      try {
        // Extract JSON string after the X.AI image marker
        const jsonStart = xaiImageIndex + xaiImageMarker.length;
        const afterMarker = response.substring(jsonStart);
        
        // Parse JSON more carefully - find the actual end of the JSON object
        let jsonString = afterMarker.trim();
        
        // If there's content after the JSON, try to find where the JSON object actually ends
        // by finding the matching closing brace
        if (jsonString.startsWith('{')) {
          let braceCount = 0;
          let inString = false;
          let escapeNext = false;
          let jsonEndIndex = -1;
          
          for (let i = 0; i < jsonString.length; i++) {
            const char = jsonString[i];
            
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            
            if (char === '"') {
              inString = !inString;
              continue;
            }
            
            if (!inString) {
              if (char === '{') {
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  jsonEndIndex = i + 1;
                  break;
                }
              }
            }
          }
          
          if (jsonEndIndex !== -1) {
            jsonString = jsonString.substring(0, jsonEndIndex);
          }
        }
        
        // Parse the X.AI image data
        const imageData = JSON.parse(jsonString);
        
        // Get text before the marker
        const textResponse = response.substring(0, xaiImageIndex).trim();
        
        console.log("✅ Successfully parsed X.AI image result, sending image URLs...");
        
        // Handle X.AI image results
        if (imageData.success && imageData.images && imageData.images.length > 0) {
          const images = imageData.images;
          
          // Send text response first
          const cleanText = cleanSpriteMarkers(textResponse) || "Your image has been created! 🎨";
          const firstReply = await message.reply(cleanText);
          
          // Send each image URL separately so Discord auto-embeds them
          for (const image of images) {
            await firstReply.reply(image.url);
          }
        } else {
          // Error case
          const cleanText = cleanSpriteMarkers(textResponse);
          await message.reply(cleanText || "I tried to create an image but encountered an issue.");
        }
      } catch (e) {
        console.error("⚠️ Failed to parse X.AI image result, showing clean fallback:", e);
        // Fallback: remove everything from the X.AI image marker onward
        const cleanResponse = cleanSpriteMarkers(response);
        await message.reply(cleanResponse || "Your image was created, but I had trouble formatting the result!");
      }
    } else if (spriteIndex !== -1) {
      try {
        // Extract JSON string after the sprite marker
        const jsonStart = spriteIndex + spriteMarker.length;
        const afterMarker = response.substring(jsonStart);
        
        // Parse JSON more carefully - find the actual end of the JSON object
        let jsonString = afterMarker.trim();
        
        // If there's content after the JSON, try to find where the JSON object actually ends
        // by finding the matching closing brace
        if (jsonString.startsWith('{')) {
          let braceCount = 0;
          let inString = false;
          let escapeNext = false;
          let jsonEndIndex = -1;
          
          for (let i = 0; i < jsonString.length; i++) {
            const char = jsonString[i];
            
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            
            if (char === '"') {
              inString = !inString;
              continue;
            }
            
            if (!inString) {
              if (char === '{') {
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  jsonEndIndex = i + 1;
                  break;
                }
              }
            }
          }
          
          if (jsonEndIndex !== -1) {
            jsonString = jsonString.substring(0, jsonEndIndex);
          }
        }
        
        // Parse the sprite data
        const spriteData = JSON.parse(jsonString);
        
        // Get text before the marker
        const textResponse = response.substring(0, spriteIndex).trim();
        
        console.log("✅ Successfully parsed sprite result, creating embed...");
        
        // Determine if this is an animation or static sprite
        const isAnimation = !!spriteData.animationUrl;
        const displayUrl = spriteData.animationUrl || spriteData.imageUrl;
        const title = isAnimation ? "🎬 Animation Created!" : null;
        
        // Check if displayUrl is a data URI
        const isDataUri = displayUrl && displayUrl.startsWith('data:');
        
        // Create minimal embed - just image, description, and direction links
        const embed = new EmbedBuilder()
          .setColor(0x7289da);
        
        // Only set title for animations
        if (title) {
          embed.setTitle(title);
        }
        
        // Build description with direction links
        // Clean any sprite markers from the text response
        const cleanText = cleanSpriteMarkers(textResponse);
        let description = cleanText || (isAnimation ? "Your animated sprite is ready!" : "Your sprite has been created!");
        
        // Add compact direction links for static sprites
        if (!isAnimation && spriteData.allDirections && spriteData.allDirections.length > 0) {
          const directions = spriteData.allDirections;
          const directionLinks = directions
            .map((d: any) => `[${d.direction}](${d.url})`)
            .join(" · ");
          
          description += `\n\n${directionLinks}`;
        }
        
        embed.setDescription(description);
        
        // Handle data URIs by converting to attachments
        if (displayUrl && isDataUri) {
          // Extract base64 data from data URI
          const matches = displayUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Determine file extension from MIME type
            const ext = mimeType.split('/')[1] || 'png';
            const filename = isAnimation ? `animation.${ext}` : `sprite.${ext}`;
            
            const attachment = new AttachmentBuilder(buffer, { name: filename });
            embed.setImage(`attachment://${filename}`);
            
            await message.reply({ embeds: [embed], files: [attachment] });
          } else {
            // Fallback: send without image
            await message.reply({ embeds: [embed] });
          }
        } else if (displayUrl) {
          // Regular URL - set directly
          embed.setImage(displayUrl);
          await message.reply({ embeds: [embed] });
        } else {
          // No image URL at all
          await message.reply({ embeds: [embed] });
        }
      } catch (e) {
        console.error("⚠️ Failed to parse sprite result, showing clean fallback:", e);
        // Fallback: remove everything from the sprite marker onward
        const cleanResponse = cleanSpriteMarkers(response);
        await message.reply(cleanResponse || "Your sprite has been created, but I had trouble formatting the result!");
      }
    } else {
      // Reply with plain text (clean any sprite markers)
      const cleanResponse = cleanSpriteMarkers(response);
      await message.reply(cleanResponse);
    }
  } catch (error) {
    console.error(`❌ Error processing message:`, error);

    try {
      await message.reply(ERROR_MESSAGE);
    } catch (replyErr) {
      console.error("Failed to send error message:", replyErr);
    }
  }
});

/**
 * Graceful shutdown
 */
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");

  await mcpClient.cleanup();
  await conversationStore.close();
  await client.destroy();

  console.log("👋 Goodbye!");
  process.exit(0);
});

// Login to Discord
client.login(DISCORD_TOKEN);

