/**
 * Configuration module for Discord bot
 */
import dotenv from "dotenv";
import { MCPServerConfig } from "./types.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..", "..");
const discordBotRoot = join(__dirname, ".."); // Go up from dist to discord-llm-bot root

// Load prompts from YAML file
interface PromptsConfig {
  planner: { prompt: string };
  response: { prompt: string };
  general: { prompt: string };
}

let promptsConfig: PromptsConfig;
try {
  const promptsPath = join(discordBotRoot, "prompts.yaml");
  const promptsFile = fs.readFileSync(promptsPath, "utf8");
  promptsConfig = yaml.load(promptsFile) as PromptsConfig;
} catch (error) {
  console.error("Failed to load prompts.yaml:", error);
  // Fallback prompts
  promptsConfig = {
    planner: {
      prompt: `You are the Tool Planner for a Discord bot. Your job is to decide if a tool should be used to answer the user's request.

Available tools:
{TOOL_DESCRIPTIONS}

Return ONLY a compact JSON object with this exact structure:
{
  "useTool": true|false,
  "tool": "tool_name",
  "args": {"param1": "value1", "param2": "value2"},
  "reason": "brief explanation"
}

Rules:
1. If the user is asking for something a tool can provide, set useTool=true and specify the tool and args
2. If it's a general conversation or question that doesn't need a tool, set useTool=false
3. Extract parameters carefully from the user's message
4. For sprite generation, default to size "32x32" unless specified
5. Return ONLY valid JSON, no other text or explanation

Examples:

User: "make me a 32x32 knight riding a wolf"
{"useTool": true, "tool": "generate_sprite", "args": {"prompt": "knight riding a wolf", "size": "32x32"}, "reason": "User wants sprite generation"}

User: "what's the weather in SF?"
{"useTool": true, "tool": "get_weather", "args": {"location": "SF"}, "reason": "User wants weather information"}

User: "how are you doing?"
{"useTool": false, "reason": "General conversation, no tool needed"}

User: "check IP 8.8.8.8"
{"useTool": true, "tool": "greynoise_ip_address", "args": {"ip_address": "8.8.8.8"}, "reason": "User wants IP intelligence"}

Now analyze the user's message and return your JSON response.`
    },
    response: {
      prompt: `You are a knowledgeable AI assistant named '{BOT_NAME}' participating in a Discord chat.
Do not include "I can't" in your response.

A tool was just executed. Use the tool result to craft your response to the user.

IMPORTANT: DO NOT include any URLs in your response. The image will be shown automatically in an embed. 
Just provide a creative, short description of what was created.`
    },
    general: {
      prompt: `You are a knowledgeable AI assistant named '{BOT_NAME}' participating in a Discord chat.`
    }
  };
}

// Discord configuration
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
export const APP_ID = process.env.APP_ID!;
export const GUILD_ID = process.env.GUILD_ID;
export const BOT_NAME = process.env.BOT_NAME || "Assistant";

// Grok configuration
export const GROK_API_KEY = process.env.GROK_API_KEY!;
export const GROK_MODEL = process.env.GROK_MODEL || "grok-4-fast";
export const GROK_BASE_URL = process.env.GROK_BASE_URL || "https://api.x.ai/v1";
export const GROK_TEMPERATURE = parseFloat(process.env.GROK_TEMPERATURE || "1");
export const GROK_MAX_TOKENS = parseInt(process.env.GROK_MAX_TOKENS || "8192");

// Grok system prompts (loaded from YAML)
export const GROK_PLANNER_PROMPT = promptsConfig.planner.prompt;
export const GROK_RESPONSE_PROMPT = promptsConfig.response.prompt;
export const GROK_GENERAL_PROMPT = promptsConfig.general.prompt;

// MongoDB configuration
export const MONGO_URI = process.env.MONGO_URI!;

// PixelLab configuration
export const PIXELLAB_API_KEY = process.env.PIXELLAB_API_KEY!;

// GreyNoise configuration
export const GREYNOISE_API_KEY = process.env.GREYNOISE_API_KEY;

// X.AI Image Generation configuration (uses same API key as Grok)
export const XAI_API_KEY = GROK_API_KEY;

// Error messages
export const ERROR_MESSAGE =
  process.env.ERROR_MESSAGE ||
  "I'm having trouble right now. Please try again in a moment! 🙏";

// Cache configuration
export const CACHE_TTL_MINUTES = parseInt(process.env.CACHE_TTL_MINUTES || "30");

// Rate limiting
export const MAX_REQUESTS_PER_USER_PER_HOUR = parseInt(
  process.env.MAX_REQUESTS_PER_USER_PER_HOUR || "20"
);

// MCP server configurations
export const MCP_SERVERS: MCPServerConfig[] = [
  {
    name: "pixellab",
    command: "node",
    args: [join(projectRoot, "mcp-servers/pixellab/dist/server.js")],
    env: {
      PIXELLAB_API_KEY: PIXELLAB_API_KEY,
    },
    tools: ["generate_sprite", "generate_image_pixflux", "rotate_sprite", "animate_sprite"],
  },
  {
    name: "tools-python",
    command: "python3",
    args: [join(projectRoot, "mcp-servers/tools-python/server.py")],
    env: {
      GREYNOISE_API_KEY: GREYNOISE_API_KEY || "",
    },
    tools: ["get_weather", "get_coolest_cities", "get_current_time", "greynoise_ip_address"],
  },
  {
    name: "xai-image",
    command: "node",
    args: [join(projectRoot, "mcp-servers/xai-image/dist/server.js")],
    env: {
      XAI_API_KEY: XAI_API_KEY,
    },
    tools: ["generate_image"],
  },
];

// Validate required configuration
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
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

validateConfig();

