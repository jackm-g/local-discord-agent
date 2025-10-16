# PixelLab MCP Server

Model Context Protocol (MCP) server for PixelLab v2 API.

**API Documentation:** 
- https://api.pixellab.ai/v2/llms.txt
- https://api.pixellab.ai/v2/docs

## Features

### Game Character Sprites
- **generate_sprite**: Generate game character sprites with 4 directional views (north, south, east, west) - uses `/create-character-with-4-directions`
- **rotate_sprite**: Create multi-angle sprite sheets (uses `/rotate`)
- **animate_sprite**: Generate animated sprites (uses `/animate-with-text`)

### Pixel Art Images
- **generate_image_pixflux**: Generate single pixel art images with fine-grained artistic control - uses `/generate-image-pixflux`

All generation operations use background jobs and poll for completion.

## When to Use Which Tool?

### Use `generate_sprite` when:
- Creating game characters, NPCs, or enemies
- You need multiple directional views for movement in a game
- Building sprites for 2D games
- Sizes limited to 16x16, 32x32, 64x64, or 128x128
- You plan to animate or rotate the sprite later

**Examples:** "Create a knight character sprite", "Generate an NPC wizard for my game", "Make a pixelated enemy slime"

### Use `generate_image_pixflux` when:
- Creating pixel art illustrations, scenes, or standalone images
- You need artistic control (outline style, detail level, isometric view)
- Want larger images (up to 400x400 pixels)
- Need transparent backgrounds
- Creating icon sets, UI elements, or decorative pixel art
- Don't need multiple directional views

**Examples:** "Create a pixel art landscape", "Generate a detailed isometric building", "Make pixel art food icons with transparent backgrounds"

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```bash
PIXELLAB_API_KEY=your_api_key_here
# PIXELLAB_BASE_URL=https://api.pixellab.ai/v1  # Optional
```

## Build

```bash
npm run build
```

## Usage

This MCP server is designed to be spawned by an MCP client (like the Discord bot). It communicates via stdio.

### Standalone Testing

```bash
npm start
```

### As MCP Server

The Discord bot spawns this server automatically. See `discord-llm-bot/src/config.ts` for configuration.

## Tools

### generate_sprite

Generate a pixel art sprite from a text prompt.

**Input:**
```json
{
  "prompt": "knight riding a wolf",
  "size": "32x32",
  "style": "fantasy",
  "seed": 12345
}
```

**Output:**
```json
{
  "spriteId": "character_uuid",
  "imageUrl": "https://..." or "data:image/png;base64,...",
  "prompt": "knight riding a wolf",
  "size": "32x32",
  "metadata": {
    "jobId": "job_uuid",
    "characterId": "character_uuid",
    "allDirections": [
      {"direction": "north", "url": "..."},
      {"direction": "east", "url": "..."},
      {"direction": "south", "url": "..."},
      {"direction": "west", "url": "..."}
    ]
  }
}
```

**Note:** Generation takes 10-30 seconds as it creates a character with 4 directional views via background job.

### rotate_sprite

Generate rotated versions of a sprite at specified angles.

**Input:**
```json
{
  "spriteId": "abc123",
  "angles": [0, 45, 90, 135, 180, 225, 270, 315]
}
```

**Output:**
```json
{
  "spriteId": "abc123",
  "spriteSheetUrl": "https://...",
  "angles": [0, 45, 90, 135, 180, 225, 270, 315]
}
```

### animate_sprite

Create an animated sprite.

**Input:**
```json
{
  "spriteId": "abc123",
  "fps": 12,
  "loop": true
}
```

**Output:**
```json
{
  "spriteId": "abc123",
  "animationUrl": "https://...",
  "fps": 12,
  "loop": true
}
```

### generate_image_pixflux

Generate a single pixel art image with fine-grained artistic control.

**Input:**
```json
{
  "description": "isometric pixel art house with red roof",
  "width": 256,
  "height": 256,
  "detail": "highly detailed",
  "isometric": true,
  "no_background": true,
  "outline": "single color black outline",
  "seed": 12345
}
```

**Optional Parameters:**
- `detail`: "low detail", "medium detail", or "highly detailed"
- `direction`: "north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"
- `isometric`: Generate in isometric view (boolean)
- `no_background`: Generate with transparent background (boolean)
- `outline`: "single color black outline", "single color outline", "selective outline", "lineless"
- `negative_description`: Features to avoid in the image
- `seed`: Random seed for reproducible generation
- `background_removal_task`: "remove_simple_background" or "remove_complex_background"
- `init_image_strength`: Strength of initial image influence (1-999, default 300)

**Output:**
```json
{
  "imageUrl": "data:image/png;base64,...",
  "description": "isometric pixel art house with red roof",
  "image_size": {
    "width": 256,
    "height": 256
  },
  "metadata": {
    "format": "png",
    "usage": {...}
  }
}
```

**Size Constraints:**
- Minimum size: 32x32
- Maximum size: 400x400 (total area)
- Width and height must be between 32-400 pixels

**Note:** Generation may be synchronous (returns immediately) or asynchronous (polls background job) depending on image complexity.

## Error Handling

The server handles errors gracefully and returns user-friendly messages:

- **401**: Authentication failed (check API key)
- **429**: Rate limit exceeded
- **400**: Invalid request parameters
- **404**: Sprite not found
- **500+**: Server errors

## Development

```bash
# Watch mode
npm run watch

# Build and start
npm run dev
```

## Architecture

- `server.ts` - MCP server implementation
- `pixellab-client.ts` - HTTP client for PixelLab API
- `schemas.ts` - Zod schemas for validation
- `types.ts` - TypeScript type definitions

