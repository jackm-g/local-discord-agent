#!/usr/bin/env node

/**
 * PixelLab MCP Server
 * Exposes sprite generation, rotation, and animation tools via MCP protocol
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { PixelLabClient } from "./pixellab-client.js";
import {
  GenerateSpriteSchema,
  RotateSpriteSchema,
  AnimateSpriteSchema,
  GenerateImagePixfluxSchema,
} from "./schemas.js";

dotenv.config();

// Initialize PixelLab client
const PIXELLAB_API_KEY = process.env.PIXELLAB_API_KEY;
const PIXELLAB_BASE_URL = process.env.PIXELLAB_BASE_URL;

if (!PIXELLAB_API_KEY) {
  console.error("ERROR: PIXELLAB_API_KEY environment variable is required");
  process.exit(1);
}

// Debug: Log API key presence (first/last 4 chars only)
const keyPreview = PIXELLAB_API_KEY.length > 8 
  ? `${PIXELLAB_API_KEY.substring(0, 4)}...${PIXELLAB_API_KEY.substring(PIXELLAB_API_KEY.length - 4)}`
  : "***";
console.error(`[PixelLab MCP] Using API key: ${keyPreview} (length: ${PIXELLAB_API_KEY.length})`);

const pixelLabClient = new PixelLabClient(PIXELLAB_API_KEY, PIXELLAB_BASE_URL);

// Define MCP tools
const TOOLS: Tool[] = [
  {
    name: "generate_sprite",
    description: `Generate a game character sprite with multiple directional views (north, south, east, west). 
    
**When to use this:**
- Creating game characters, NPCs, or enemies
- Need multiple directional views for movement
- Building sprites for 2D games
- Sizes limited to 16x16, 32x32, 64x64, or 128x128
- Want to later animate or rotate the sprite

**Example use cases:** "Create a knight character sprite", "Generate an NPC wizard", "Make a pixelated enemy slime"`,
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Description of the sprite to generate (e.g., 'knight riding a wolf')",
          minLength: 1,
          maxLength: 500,
        },
        size: {
          type: "string",
          enum: ["16x16", "32x32", "64x64", "128x128"],
          description: "Size of the sprite in pixels",
        },
        style: {
          type: "string",
          description: "Art style (e.g., 'pixel-art', 'fantasy', 'sci-fi')",
        },
        seed: {
          type: "number",
          description: "Random seed for reproducible generation",
        },
      },
      required: ["prompt", "size"],
    },
  },
  {
    name: "generate_image_pixflux",
    description: `Generate a single pixel art image or artwork with fine-grained artistic control.

**When to use this:**
- Creating pixel art illustrations, scenes, or standalone images
- Need artistic control (outline style, detail level, isometric view)
- Want larger images (up to 400x400)
- Need transparent backgrounds
- Creating icon sets, UI elements, or decorative pixel art
- Don't need multiple directional views

**Example use cases:** "Create a pixel art landscape", "Generate a detailed isometric building", "Make pixel art food icons with transparent backgrounds"`,
    inputSchema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Text description of the image to generate",
          minLength: 1,
          maxLength: 500,
        },
        width: {
          type: "number",
          description: "Image width in pixels (32-400, total area max 400x400)",
          minimum: 32,
          maximum: 400,
        },
        height: {
          type: "number",
          description: "Image height in pixels (32-400, total area max 400x400)",
          minimum: 32,
          maximum: 400,
        },
        detail: {
          type: "string",
          enum: ["low detail", "medium detail", "highly detailed"],
          description: "Detail style reference (weakly guiding)",
        },
        direction: {
          type: "string",
          enum: ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"],
          description: "Subject direction (weakly guiding)",
        },
        isometric: {
          type: "boolean",
          description: "Generate in isometric view (weakly guiding)",
          default: false,
        },
        no_background: {
          type: "boolean",
          description: "Generate with transparent background",
          default: false,
        },
        outline: {
          type: "string",
          enum: ["single color black outline", "single color outline", "selective outline", "lineless"],
          description: "Outline style reference (weakly guiding)",
        },
        negative_description: {
          type: "string",
          description: "Negative prompt to avoid certain features",
        },
        seed: {
          type: "number",
          description: "Random seed for reproducible generation",
        },
        background_removal_task: {
          type: "string",
          enum: ["remove_simple_background", "remove_complex_background"],
          description: "Background removal complexity",
        },
        init_image_strength: {
          type: "number",
          description: "Strength of the initial image influence (1-999)",
          minimum: 1,
          maximum: 999,
          default: 300,
        },
      },
      required: ["description", "width", "height"],
    },
  },
  {
    name: "rotate_sprite",
    description: "Generate rotated versions of an existing sprite at specified angles. Returns a sprite sheet URL.",
    inputSchema: {
      type: "object",
      properties: {
        spriteId: {
          type: "string",
          description: "ID of the sprite to rotate",
          minLength: 1,
        },
        angles: {
          type: "array",
          items: { type: "number" },
          description: "Array of rotation angles in degrees (e.g., [0, 45, 90, 135, 180, 225, 270, 315])",
          minItems: 1,
          maxItems: 16,
        },
      },
      required: ["spriteId", "angles"],
    },
  },
  {
    name: "animate_sprite",
    description: "Create an animated GIF or video from a sprite. Returns an animation URL.",
    inputSchema: {
      type: "object",
      properties: {
        spriteId: {
          type: "string",
          description: "ID of the sprite to animate",
          minLength: 1,
        },
        fps: {
          type: "number",
          description: "Frames per second (1-60)",
          minimum: 1,
          maximum: 60,
        },
        loop: {
          type: "boolean",
          description: "Whether the animation should loop",
        },
      },
      required: ["spriteId"],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: "pixellab-mcp-server",
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

  console.error(`[PixelLab MCP] Tool called: ${name}`);
  console.error(`[PixelLab MCP] Arguments:`, JSON.stringify(args, null, 2));

  try {
    switch (name) {
      case "generate_sprite": {
        console.error(`[PixelLab MCP] Validating generate_sprite arguments...`);
        const params = GenerateSpriteSchema.parse(args);
        console.error(`[PixelLab MCP] Validation passed, calling PixelLab API...`);
        const result = await pixelLabClient.generateSprite(params);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "generate_image_pixflux": {
        console.error(`[PixelLab MCP] Validating generate_image_pixflux arguments...`);
        const params = GenerateImagePixfluxSchema.parse(args);
        console.error(`[PixelLab MCP] Validation passed, calling PixelLab API...`);
        
        // Convert to API format
        const apiParams = {
          description: params.description,
          image_size: {
            width: params.width,
            height: params.height,
          },
          background_removal_task: params.background_removal_task,
          detail: params.detail,
          direction: params.direction,
          init_image_strength: params.init_image_strength,
          isometric: params.isometric,
          negative_description: params.negative_description,
          no_background: params.no_background,
          outline: params.outline,
          seed: params.seed,
        };
        
        const result = await pixelLabClient.generateImagePixflux(apiParams);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "rotate_sprite": {
        const params = RotateSpriteSchema.parse(args);
        const result = await pixelLabClient.rotateSprite(params);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "animate_sprite": {
        const params = AnimateSpriteSchema.parse(args);
        const result = await pixelLabClient.animateSprite(params);
        
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
  console.error("PixelLab MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

