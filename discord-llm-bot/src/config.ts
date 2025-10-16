/**
 * Configuration module for Discord bot
 */
import dotenv from "dotenv";
import { MCPServerConfig } from "./types.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..", "..");

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

