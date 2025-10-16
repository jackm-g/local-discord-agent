/**
 * Zod schemas for tool validation - mirrors MCP tool schemas
 */
import { z } from "zod";

// PixelLab tool schemas
export const GenerateSpriteArgsSchema = z.object({
  prompt: z.string().min(1).max(500),
  size: z.enum(["16x16", "32x32", "64x64", "128x128"]),
  style: z.string().optional(),
  seed: z.number().int().optional(),
});

export const RotateSpriteArgsSchema = z.object({
  spriteId: z.string().min(1),
  angles: z.array(z.number()).min(1).max(16),
});

export const AnimateSpriteArgsSchema = z.object({
  spriteId: z.string().min(1),
  fps: z.number().int().min(1).max(60).optional(),
  loop: z.boolean().optional(),
});

export const GenerateImagePixfluxArgsSchema = z.object({
  description: z.string().min(1).max(500),
  width: z.number().int().min(32).max(400),
  height: z.number().int().min(32).max(400),
  detail: z.enum(["low detail", "medium detail", "highly detailed"]).optional(),
  direction: z.enum(["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"]).optional(),
  isometric: z.boolean().optional(),
  no_background: z.boolean().optional(),
  outline: z.enum(["single color black outline", "single color outline", "selective outline", "lineless"]).optional(),
  negative_description: z.string().optional(),
  seed: z.number().int().optional(),
  background_removal_task: z.enum(["remove_simple_background", "remove_complex_background"]).optional(),
  init_image_strength: z.number().int().min(1).max(999).optional(),
});

// Python tools schemas
export const GetWeatherArgsSchema = z.object({
  location: z.string().min(1),
});

export const GetCoolestCitiesArgsSchema = z.object({});

export const GetCurrentTimeArgsSchema = z.object({});

export const GreynoiseIpAddressArgsSchema = z.object({
  ip_address: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/),
});

// X.AI Image Generation tool schema
export const GenerateImageArgsSchema = z.object({
  prompt: z.string().min(1).max(4000),
  n: z.number().int().min(1).max(10).optional(),
  response_format: z.enum(["url", "b64_json"]).optional(),
  user: z.string().optional(),
});

// Tool plan schema (from Grok)
export const ToolPlanSchema = z.object({
  useTool: z.boolean(),
  tool: z.string().optional(),
  args: z.record(z.any()).optional(),
  reason: z.string(),
});

// Registry of all tool schemas
export const TOOL_SCHEMAS: Record<string, z.ZodSchema> = {
  generate_sprite: GenerateSpriteArgsSchema,
  generate_image_pixflux: GenerateImagePixfluxArgsSchema,
  rotate_sprite: RotateSpriteArgsSchema,
  animate_sprite: AnimateSpriteArgsSchema,
  get_weather: GetWeatherArgsSchema,
  get_coolest_cities: GetCoolestCitiesArgsSchema,
  get_current_time: GetCurrentTimeArgsSchema,
  greynoise_ip_address: GreynoiseIpAddressArgsSchema,
  generate_image: GenerateImageArgsSchema,
};

/**
 * Validate tool arguments against the schema
 */
export function validateToolArgs(toolName: string, args: any): { valid: boolean; data?: any; error?: string } {
  const schema = TOOL_SCHEMAS[toolName];
  if (!schema) {
    return { valid: false, error: `Unknown tool: ${toolName}` };
  }

  try {
    const data = schema.parse(args);
    return { valid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return { valid: false, error: `Validation failed: ${messages}` };
    }
    return { valid: false, error: "Unknown validation error" };
  }
}

