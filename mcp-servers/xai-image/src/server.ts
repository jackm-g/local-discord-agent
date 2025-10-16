#!/usr/bin/env node

/**
 * X.AI Image Generation MCP Server
 * Exposes X.AI image generation capabilities via MCP protocol
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { XAIImageClient } from "./xai-client.js";
import { GenerateImageSchema } from "./types.js";

dotenv.config();

// Initialize X.AI client
const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";

if (!XAI_API_KEY) {
  console.error("ERROR: XAI_API_KEY environment variable is required");
  console.error("Note: This should be set to your GROK_API_KEY from the Discord bot configuration");
  process.exit(1);
}

// Debug: Log API key presence (first/last 4 chars only)
const keyPreview = XAI_API_KEY.length > 8 
  ? `${XAI_API_KEY.substring(0, 4)}...${XAI_API_KEY.substring(XAI_API_KEY.length - 4)}`
  : "***";
console.error(`[X.AI Image MCP] Using API key: ${keyPreview} (length: ${XAI_API_KEY.length})`);

const xaiClient = new XAIImageClient(XAI_API_KEY, XAI_BASE_URL);

// Define MCP tools
const TOOLS: Tool[] = [
  {
    name: "generate_image",
    description: `Generate high-quality images using X.AI's Grok-2-Vision-1212 model.

**When to use this:**
- Creating realistic images, artwork, or illustrations
- Need high-quality images with detailed prompts
- Want to generate multiple variations of an image
- Creating images for presentations, social media, or creative projects
- Need images with specific styles (vivid or natural)

**Example use cases:** "Create a photo of a sunset over mountains", "Generate a digital painting of a fantasy castle", "Make a professional headshot of a business person"`,
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Text description of the image to generate",
          minLength: 1,
          maxLength: 4000,
        },
        size: {
          type: "string",
          enum: ["1024x1024", "1024x1792", "1792x1024"],
          description: "Image size - square (1024x1024), portrait (1024x1792), or landscape (1792x1024)",
          default: "1024x1024",
        },
        quality: {
          type: "string",
          enum: ["standard", "hd"],
          description: "Image quality - standard or high definition",
          default: "standard",
        },
        style: {
          type: "string",
          enum: ["vivid", "natural"],
          description: "Image style - vivid (more dramatic) or natural (more realistic)",
          default: "vivid",
        },
        n: {
          type: "number",
          description: "Number of images to generate (1-4)",
          minimum: 1,
          maximum: 4,
          default: 1,
        },
      },
      required: ["prompt"],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: "xai-image-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.error(`[X.AI Image MCP] Tool called: ${name}`);
  console.error(`[X.AI Image MCP] Arguments:`, JSON.stringify(args, null, 2));

  try {
    switch (name) {
      case "generate_image": {
        console.error(`[X.AI Image MCP] Validating generate_image arguments...`);
        const params = GenerateImageSchema.parse(args);
        console.error(`[X.AI Image MCP] Validation passed, calling X.AI API...`);
        const result = await xaiClient.generateImage(params);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("X.AI Image MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
