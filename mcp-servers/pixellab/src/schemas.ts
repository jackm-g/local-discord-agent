/**
 * Zod schemas for PixelLab tool inputs
 */
import { z } from "zod";

export const GenerateSpriteSchema = z.object({
  prompt: z.string().min(1).max(500).describe("Description of the sprite to generate"),
  size: z.enum(["16x16", "32x32", "64x64", "128x128"]).describe("Size of the sprite"),
  style: z.string().optional().describe("Art style (e.g., 'pixel-art', 'fantasy', 'sci-fi')"),
  seed: z.number().int().optional().describe("Random seed for reproducible generation"),
});

export const RotateSpriteSchema = z.object({
  spriteId: z.string().min(1).describe("ID of the sprite to rotate"),
  angles: z.array(z.number()).min(1).max(16).describe("Array of rotation angles in degrees"),
});

export const AnimateSpriteSchema = z.object({
  spriteId: z.string().min(1).describe("ID of the sprite to animate"),
  fps: z.number().int().min(1).max(60).optional().default(12).describe("Frames per second"),
  loop: z.boolean().optional().default(true).describe("Whether animation should loop"),
});

const Base64ImageSchema = z.object({
  type: z.literal("base64"),
  base64: z.string(),
  format: z.string(),
});

export const GenerateImagePixfluxSchema = z.object({
  description: z.string().min(1).max(500).describe("Text description of the image to generate"),
  width: z.number().int().min(32).max(400).describe("Image width in pixels"),
  height: z.number().int().min(32).max(400).describe("Image height in pixels"),
  background_removal_task: z.enum(["remove_simple_background", "remove_complex_background"]).optional().describe("Background removal complexity"),
  detail: z.enum(["low detail", "medium detail", "highly detailed"]).optional().describe("Detail style reference (weakly guiding)"),
  direction: z.enum(["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"]).optional().describe("Subject direction (weakly guiding)"),
  init_image_strength: z.number().int().min(1).max(999).optional().default(300).describe("Strength of the initial image influence"),
  isometric: z.boolean().optional().default(false).describe("Generate in isometric view (weakly guiding)"),
  negative_description: z.string().optional().default("").describe("Negative prompt to avoid certain features"),
  no_background: z.boolean().optional().default(false).describe("Generate with transparent background"),
  outline: z.enum(["single color black outline", "single color outline", "selective outline", "lineless"]).optional().describe("Outline style reference (weakly guiding)"),
  seed: z.number().int().optional().describe("Random seed for reproducible generation"),
});

export type GenerateSpriteInput = z.infer<typeof GenerateSpriteSchema>;
export type RotateSpriteInput = z.infer<typeof RotateSpriteSchema>;
export type AnimateSpriteInput = z.infer<typeof AnimateSpriteSchema>;
export type GenerateImagePixfluxInput = z.infer<typeof GenerateImagePixfluxSchema>;

