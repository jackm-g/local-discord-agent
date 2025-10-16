import { GenerateImageArgs, XAIImageGenerationResponse, ImageGenerationResult } from "./types.js";

/**
 * X.AI Image Generation Client
 * Handles API calls to X.AI's image generation endpoint
 */
export class XAIImageClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://api.x.ai/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Generate an image using X.AI's Grok-2-Vision-1212 model
   */
  async generateImage(args: GenerateImageArgs): Promise<ImageGenerationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-2-vision-1212",
          prompt: args.prompt,
          size: args.size,
          quality: args.quality,
          style: args.style,
          n: args.n,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`X.AI API error (${response.status}): ${errorData}`);
      }

      const data: XAIImageGenerationResponse = await response.json();

      return {
        success: true,
        images: data.data.map(item => ({
          url: item.url,
          revised_prompt: item.revised_prompt,
        })),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return {
        success: false,
        images: [],
        error: errorMessage,
      };
    }
  }
}
