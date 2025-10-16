# X.AI Image Generation MCP Server

This MCP server provides access to X.AI's image generation API (Grok-2-Vision-1212) for creating images from text prompts.

## Features

- Generate images using X.AI's Grok-2-Vision-1212 model
- Support for various image sizes and quality settings
- Integration with MCP protocol for seamless tool access

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Add your X.AI API key to `.env`:
   ```
   XAI_API_KEY=your_api_key_here
   ```

4. Run the server:
   ```bash
   npm start
   ```

## Environment Variables

- `XAI_API_KEY`: Your X.AI API key (required)

## Tools

### generate_image

Generate an image from a text prompt using X.AI's Grok-2-Vision-1212 model.

**Parameters:**
- `prompt` (string, required): Text description of the image to generate
- `size` (string, optional): Image size - "1024x1024", "1024x1792", or "1792x1024" (default: "1024x1024")
- `quality` (string, optional): Image quality - "standard" or "hd" (default: "standard")
- `style` (string, optional): Image style - "vivid" or "natural" (default: "vivid")
- `n` (number, optional): Number of images to generate (1-4, default: 1)

**Example:**
```json
{
  "prompt": "A majestic dragon flying over a medieval castle at sunset",
  "size": "1024x1024",
  "quality": "hd",
  "style": "vivid",
  "n": 1
}
```

## API Reference

This server uses the X.AI Image Generations API:
- Endpoint: `https://api.x.ai/v1/images/generations`
- Model: `grok-2-vision-1212`
- Documentation: https://docs.x.ai/docs/api-reference#image-generations
