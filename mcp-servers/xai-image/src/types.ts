import { z } from "zod";

// Schema for generate_image tool arguments
export const GenerateImageSchema = z.object({
  prompt: z.string().min(1).max(4000).describe("Text description of the image to generate"),
  size: z.enum(["1024x1024", "1024x1792", "1792x1024"]).optional().default("1024x1024").describe("Image size"),
  quality: z.enum(["standard", "hd"]).optional().default("standard").describe("Image quality"),
  style: z.enum(["vivid", "natural"]).optional().default("vivid").describe("Image style"),
  n: z.number().int().min(1).max(4).optional().default(1).describe("Number of images to generate"),
});

// Type for generate_image arguments
export type GenerateImageArgs = z.infer<typeof GenerateImageSchema>;

// API response types
export interface XAIImageGenerationResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}

export interface ImageGenerationResult {
  success: boolean;
  images: Array<{
    url: string;
    revised_prompt?: string;
  }>;
  error?: string;
}
