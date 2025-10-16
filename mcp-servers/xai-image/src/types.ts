import { z } from "zod";

// Schema for generate_image tool arguments
export const GenerateImageSchema = z.object({
  prompt: z.string().min(1).max(4000).describe("Text description of the image to generate"),
  n: z.number().int().min(1).max(10).optional().default(1).describe("Number of images to generate (1-10)"),
  response_format: z.enum(["url", "b64_json"]).optional().default("url").describe("Response format - url or b64_json"),
  user: z.string().optional().describe("Unique identifier for the user (optional)"),
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
