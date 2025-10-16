/**
 * HTTP client for PixelLab API v2
 * Documentation: https://api.pixellab.ai/v2/llms.txt
 */
import axios, { AxiosInstance, AxiosError } from "axios";
import sharp from "sharp";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;
import type {
  GenerateSpriteParams,
  GenerateSpriteResponse,
  RotateSpriteParams,
  RotateSpriteResponse,
  AnimateSpriteParams,
  AnimateSpriteResponse,
  GenerateImagePixfluxParams,
  GenerateImagePixfluxResponse,
  PixelLabError,
} from "./types.js";

interface BackgroundJobResponse {
  background_job_id: string;
  character_id?: string;
  animation_id?: string;
  status?: string;
}

interface JobStatusResponse {
  status: "pending" | "processing" | "completed" | "failed";
  result?: any;
  error?: string;
}

export class PixelLabClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;
  private maxPollAttempts: number = 60; // 60 attempts × 5 seconds = 5 minutes max (for larger images)
  private pollInterval: number = 5000; // 5 seconds between polls

  constructor(apiKey: string, baseUrl: string = "https://api.pixellab.ai/v2") {
    this.apiKey = apiKey.trim(); // Remove any whitespace/quotes
    this.baseUrl = baseUrl;
    
    console.error(`[PixelLab Client] Initialized with base URL: ${this.baseUrl}`);
    console.error(`[PixelLab Client] API key length: ${this.apiKey.length} characters`);
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 120000, // 120 second (2 minute) timeout for individual API requests
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    // Add retry logic with exponential backoff
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as any;
        if (!config || !config.retry) {
          config.retry = 0;
        }

        // Retry on 5xx errors or network errors
        if (
          (error.response?.status && error.response.status >= 500) ||
          !error.response
        ) {
          if (config.retry < 3) {
            config.retry += 1;
            const delay = Math.pow(2, config.retry) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.client.request(config);
          }
        }

        throw error;
      }
    );
  }

  async generateSprite(params: GenerateSpriteParams): Promise<GenerateSpriteResponse> {
    try {
      // Parse size (e.g., "32x32" -> {width: 32, height: 32})
      const [width, height] = params.size.split("x").map(Number);

      // Create character with PixelLab v2 API
      console.error(`[PixelLab] Creating character: "${params.prompt}" at ${params.size}`);
      
      const requestBody: any = {
        description: params.prompt,
        image_size: { width, height },
      };
      
      // Only add optional fields if they have values
      if (params.seed !== undefined && params.seed !== null) {
        requestBody.seed = params.seed;
      }
      
      if (params.style === "isometric") {
        requestBody.isometric = true;
      }
      
      console.error(`[PixelLab] Request body:`, JSON.stringify(requestBody, null, 2));
      
      const createResponse = await this.client.post<BackgroundJobResponse>(
        "/create-character-with-4-directions",
        requestBody
      );

      console.error(`[PixelLab] API Response:`, JSON.stringify(createResponse.data, null, 2));

      if (!createResponse.data.background_job_id) {
        console.error(`[PixelLab] No background_job_id in response`);
        throw new Error(`No job ID in API response: ${JSON.stringify(createResponse.data)}`);
      }

      const jobId = createResponse.data.background_job_id;
      const characterId = createResponse.data.character_id;

      console.error(`[PixelLab] Job created: ${jobId}, character: ${characterId}`);
      console.error(`[PixelLab] Polling for completion...`);

      // Poll for job completion
      const result = await this.pollJobStatus(jobId);

      if (result.status === "failed") {
        throw new Error(result.error || "Character generation failed");
      }

      // Get character details to retrieve image URLs
      const characterResponse = await this.client.get<{
        id: string;
        name: string;
        prompt: string;
        rotation_urls: {
          north?: string;
          south?: string;
          east?: string;
          west?: string;
          [key: string]: string | null | undefined;
        };
      }>(`/characters/${characterId}`);

      console.error(`[PixelLab] Character data:`, JSON.stringify(characterResponse.data, null, 2));

      if (!characterResponse.data.rotation_urls) {
        throw new Error("No rotation_urls in character response");
      }

      // Get the first available image (prefer south for default display)
      const rotationUrls = characterResponse.data.rotation_urls;
      const imageUrl = rotationUrls.south || rotationUrls.north || rotationUrls.east || rotationUrls.west;

      if (!imageUrl) {
        throw new Error("No valid image URLs in rotation_urls");
      }

      console.error(`[PixelLab] Character generated successfully! Image URL: ${imageUrl}`);

      // Convert rotation_urls to array format for metadata
      const allDirections = Object.entries(rotationUrls)
        .filter(([_, url]) => url !== null && url !== undefined)
        .map(([direction, url]) => ({ direction, url: url as string }));

      return {
        spriteId: characterId!,
        imageUrl,
        prompt: params.prompt,
        size: params.size,
        metadata: {
          jobId,
          characterId: characterId!,
          allDirections,
        },
      };
    } catch (error) {
      throw this.handleError(error, "Failed to generate sprite");
    }
  }

  /**
   * Create an animated GIF from base64 PNG frames
   */
  private async createAnimatedGif(
    frames: Array<{ base64: string; format: string }>,
    fps: number = 8
  ): Promise<string> {
    console.error(`[PixelLab] Creating animated GIF from ${frames.length} frames at ${fps} FPS`);

    const delay = Math.round(1000 / fps); // Delay between frames in ms
    
    // Decode all PNG frames using sharp
    const frameBuffers: Buffer[] = [];
    let width = 0;
    let height = 0;

    for (let i = 0; i < frames.length; i++) {
      const pngBuffer = Buffer.from(frames[i].base64, 'base64');
      const image = sharp(pngBuffer);
      const metadata = await image.metadata();
      
      if (i === 0) {
        width = metadata.width!;
        height = metadata.height!;
      }

      // Convert to raw RGBA data
      const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      frameBuffers.push(data);
    }

    console.error(`[PixelLab] Decoded ${frameBuffers.length} frames (${width}x${height})`);

    // Create GIF encoder
    const gif = GIFEncoder();

    // Process each frame
    for (const frameData of frameBuffers) {
      // Convert RGBA buffer to format expected by gifenc
      const palette = quantize(frameData, 256);
      const index = applyPalette(frameData, palette);
      
      gif.writeFrame(index, width, height, { palette, delay });
    }

    gif.finish();

    // Get the GIF buffer and convert to base64 data URI
    const gifBuffer = Buffer.from(gif.bytes());
    const gifDataUri = `data:image/gif;base64,${gifBuffer.toString('base64')}`;
    
    console.error(`[PixelLab] Created animated GIF: ${gifBuffer.length} bytes`);
    
    return gifDataUri;
  }

  /**
   * Poll background job until completion
   */
  private async pollJobStatus(jobId: string): Promise<JobStatusResponse> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      try {
        const response = await this.client.get<JobStatusResponse>(`/background-jobs/${jobId}`);

        const status = response.data.status;
        console.error(`[PixelLab] Job ${jobId} status: ${status} (attempt ${attempt + 1}/${this.maxPollAttempts})`);

        if (status === "completed") {
          return response.data;
        } else if (status === "failed") {
          return response.data;
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
      } catch (error) {
        if (attempt === this.maxPollAttempts - 1) {
          throw error;
        }
        // Continue polling on errors
        await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
      }
    }

    throw new Error("Timeout waiting for character generation");
  }

  async rotateSprite(params: RotateSpriteParams): Promise<RotateSpriteResponse> {
    try {
      // Get the character to retrieve the base image
      console.log(`[PixelLab] Rotating character: ${params.spriteId}`);
      
      const characterResponse = await this.client.get<{
        id: string;
        rotation_urls: {
          north?: string;
          [key: string]: string | null | undefined;
        };
      }>(`/characters/${params.spriteId}`);

      if (!characterResponse.data.rotation_urls) {
        throw new Error("Character not found or has no rotation URLs");
      }

      // Get first available URL for rotation base
      const firstImageUrl = characterResponse.data.rotation_urls.north || 
        Object.values(characterResponse.data.rotation_urls).find(url => url);
      
      if (!firstImageUrl) {
        throw new Error("No valid image URL found for rotation");
      }
      
      // Note: PixelLab rotate endpoint expects base64 images, but we only have URLs
      // For now, return the existing rotation URLs from the character
      // A full implementation would download the image, convert to base64, and rotate
      
      console.error(`[PixelLab] Note: Using existing character rotations. Full rotation API requires base64 input.`);

      console.error(`[PixelLab] Rotation complete`);

      return {
        spriteId: params.spriteId,
        spriteSheetUrl: firstImageUrl,
        angles: params.angles,
        metadata: {
          note: "Showing existing character rotations. Full rotation API requires base64 input.",
          availableRotations: characterResponse.data.rotation_urls,
        },
      };
    } catch (error) {
      throw this.handleError(error, "Failed to rotate sprite");
    }
  }

  async generateImagePixflux(params: GenerateImagePixfluxParams): Promise<GenerateImagePixfluxResponse> {
    try {
      console.error(`[PixelLab] Creating pixel art image: "${params.description}" at ${params.image_size.width}x${params.image_size.height}`);
      
      const requestBody: any = {
        description: params.description,
        image_size: params.image_size,
      };
      
      // Add optional parameters
      if (params.background_removal_task) {
        requestBody.background_removal_task = params.background_removal_task;
      }
      if (params.color_image) {
        requestBody.color_image = params.color_image;
      }
      if (params.detail) {
        requestBody.detail = params.detail;
      }
      if (params.direction) {
        requestBody.direction = params.direction;
      }
      if (params.init_image) {
        requestBody.init_image = params.init_image;
      }
      if (params.init_image_strength !== undefined) {
        requestBody.init_image_strength = params.init_image_strength;
      }
      if (params.isometric !== undefined) {
        requestBody.isometric = params.isometric;
      }
      if (params.negative_description) {
        requestBody.negative_description = params.negative_description;
      }
      if (params.no_background !== undefined) {
        requestBody.no_background = params.no_background;
      }
      if (params.outline) {
        requestBody.outline = params.outline;
      }
      if (params.seed !== undefined) {
        requestBody.seed = params.seed;
      }
      
      console.error(`[PixelLab] Request body:`, JSON.stringify(requestBody, null, 2));
      
      const response = await this.client.post<{
        usage?: any;
        background_job_id?: string;
        status?: string;
        image?: {
          base64?: string;
          format?: string;
        };
      }>("/create-image-pixflux", requestBody);

      console.error(`[PixelLab] API Response:`, JSON.stringify({
        ...response.data,
        image: response.data.image ? `[base64 data: ${response.data.image.base64?.length || 0} chars]` : undefined
      }, null, 2));

      // Check if response contains image directly (synchronous response)
      if (response.data.image && response.data.image.base64) {
        console.error(`[PixelLab] Image generated synchronously`);
        
        // Convert base64 to data URI
        const imageUrl = `data:image/${response.data.image.format || 'png'};base64,${response.data.image.base64}`;
        
        console.error(`[PixelLab] Image created successfully!`);

        return {
          imageUrl,
          description: params.description,
          image_size: params.image_size,
          metadata: {
            format: response.data.image.format || 'png',
            usage: response.data.usage,
          },
        };
      }

      // Handle background job (asynchronous response)
      if (!response.data.background_job_id) {
        throw new Error(`No job ID or image in API response: ${JSON.stringify(response.data)}`);
      }

      const jobId = response.data.background_job_id;
      console.error(`[PixelLab] Background job created: ${jobId}`);
      console.error(`[PixelLab] Polling for completion...`);

      // Poll for job completion
      const jobStatus = await this.pollJobStatus(jobId);

      if (jobStatus.status !== "completed") {
        throw new Error(jobStatus.error || `Image generation failed with status: ${jobStatus.status}`);
      }

      // The result should contain the image data
      if (!jobStatus.result?.image?.base64) {
        throw new Error("No image data in completed job result");
      }

      const imageUrl = `data:image/${jobStatus.result.image.format || 'png'};base64,${jobStatus.result.image.base64}`;
      
      console.error(`[PixelLab] Image created successfully!`);

      return {
        imageUrl,
        description: params.description,
        image_size: params.image_size,
        metadata: {
          jobId,
          format: jobStatus.result.image.format || 'png',
          usage: jobStatus.result.usage,
        },
      };
    } catch (error) {
      throw this.handleError(error, "Failed to generate pixel art image");
    }
  }

  async animateSprite(params: AnimateSpriteParams): Promise<AnimateSpriteResponse> {
    try {
      console.error(`[PixelLab] Animating character: ${params.spriteId}`);
      
      // Get the character
      const characterResponse = await this.client.get<{
        id: string;
        name: string;
        prompt: string;
        rotation_urls: {
          [key: string]: string | null | undefined;
        };
      }>(`/characters/${params.spriteId}`);

      if (!characterResponse.data.rotation_urls) {
        throw new Error("Character not found or has no rotation URLs");
      }

      // Get the south-facing sprite URL (default)
      const rotationUrls = characterResponse.data.rotation_urls;
      const spriteUrl = rotationUrls.south || rotationUrls.north || rotationUrls.east || rotationUrls.west;
      
      if (!spriteUrl) {
        throw new Error("No valid sprite image found");
      }

      console.error(`[PixelLab] Downloading sprite from: ${spriteUrl}`);
      
      // Download the sprite image (use axios directly without auth header for CDN)
      const imageResponse = await axios.get(spriteUrl, {
        responseType: 'arraybuffer',
        // Don't include PixelLab API key - this is a public CDN URL
      });
      
      // Convert to base64
      const base64Image = Buffer.from(imageResponse.data).toString('base64');
      console.error(`[PixelLab] Converted sprite to base64 (${base64Image.length} chars)`);

      // animate-with-text endpoint only supports 64x64 images
      const imageSize = { width: 64, height: 64 };

      // Use animate-with-text endpoint which doesn't require pose keypoints
      const requestBody: any = {
        reference_image: {
          base64: base64Image,
          format: "png",  // Assuming PNG format from Backblaze CDN
        },
        image_size: imageSize,
        description: characterResponse.data.prompt || "pixel art character",
        action: "walk",  // API uses "action" not "animation_type"
        view: "side",    // Required field
        direction: "south",  // Required field - matches the default sprite direction we fetch
        n_frames: 4,     // Default to 4 frames
      };

      console.error(`[PixelLab] Request body:`, {
        ...requestBody,
        reference_image: `[base64 data: ${base64Image.length} chars]`
      });

      // Create animation using the animate-with-text endpoint
      const createResponse = await this.client.post<{
        usage?: any;
        background_job_id?: string;
        animation_id?: string;
        status?: string;
        images?: Array<{ base64?: string; format?: string }>;
      }>("/animate-with-text", requestBody);

      console.error(`[PixelLab] API Response:`, JSON.stringify(createResponse.data, null, 2));

      // Check if response contains images directly (synchronous response)
      if (createResponse.data.images && Array.isArray(createResponse.data.images)) {
        console.error(`[PixelLab] Animation completed synchronously with ${createResponse.data.images.length} frames`);
        
        // Create animated GIF from the frames
        const animationUrl = await this.createAnimatedGif(
          createResponse.data.images.filter(f => f.base64) as Array<{ base64: string; format: string }>,
          params.fps || 8
        );
        
        console.error(`[PixelLab] Animation created successfully!`);

        return {
          spriteId: params.spriteId,
          animationUrl,
          fps: params.fps || 8,
          loop: params.loop !== undefined ? params.loop : true,
          metadata: {
            frameCount: createResponse.data.images.length,
            description: characterResponse.data.prompt,
            action: "walk",
            direction: "south",
            view: "side",
          },
        };
      }

      // Otherwise, handle as background job (asynchronous response)
      if (!createResponse.data.background_job_id) {
        throw new Error(`No job ID or images in API response: ${JSON.stringify(createResponse.data)}`);
      }

      const jobId = createResponse.data.background_job_id;
      const animationId = createResponse.data.animation_id;

      console.error(`[PixelLab] Animation job created: ${jobId}, animation: ${animationId}`);

      // Poll for completion
      const jobStatus = await this.pollJobStatus(jobId);

      if (jobStatus.status !== "completed") {
        throw new Error(`Animation job failed with status: ${jobStatus.status}`);
      }

      // Fetch the animation details using the correct endpoint
      const animationResponse = await this.client.get<{
        id: string;
        name: string;
        description: string;
        url: string;
        fps: number;
        loop: boolean;
        animation_type: string;
        created_at: string;
      }>(`/animations/${animationId}`);

      console.error(`[PixelLab] Animation data:`, JSON.stringify(animationResponse.data, null, 2));

      if (!animationResponse.data.url) {
        throw new Error("No animation URL in response");
      }

      console.error(`[PixelLab] Animation created successfully! URL: ${animationResponse.data.url}`);

      return {
        spriteId: params.spriteId,
        animationUrl: animationResponse.data.url,
        fps: animationResponse.data.fps || params.fps || 8,
        loop: params.loop !== undefined ? params.loop : true,
        metadata: {
          jobId,
          animationId: animationResponse.data.id,
          animationType: animationResponse.data.animation_type || "walk",
          name: animationResponse.data.name,
          description: animationResponse.data.description || characterResponse.data.prompt,
          createdAt: animationResponse.data.created_at,
        },
      };
    } catch (error) {
      throw this.handleError(error, "Failed to animate sprite");
    }
  }

  private handleError(error: unknown, defaultMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<PixelLabError>;
      
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data;

        // Log full error details
        console.error(`[PixelLab] API Error (${status}):`, JSON.stringify(data, null, 2));
        console.error(`[PixelLab] Request URL:`, axiosError.config?.url);
        console.error(`[PixelLab] Request method:`, axiosError.config?.method);
        console.error(`[PixelLab] Request data:`, axiosError.config?.data);

        // Handle specific error codes
        if (status === 401) {
          console.error(`[PixelLab] Authentication failed - API key may be invalid or expired`);
          console.error(`[PixelLab] API key being used: ${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)} (length: ${this.apiKey.length})`);
          return new Error("PixelLab API authentication failed. Check your API key.");
        } else if (status === 422) {
          // Validation error - extract details but strip base64 data for readability
          console.error(`[PixelLab] Validation error details:`, JSON.stringify(data, null, 2));
          
          // Create user-friendly error message without base64
          const errorMsg = this.formatValidationError(data);
          return new Error(`Validation error: ${errorMsg}`);
        } else if (status === 429) {
          return new Error("Rate limit exceeded. Please try again in a moment.");
        } else if (status === 400) {
          return new Error(`Invalid request: ${data?.error || "Bad request"}`);
        } else if (status === 404) {
          return new Error("Sprite not found. Please check the sprite ID.");
        } else if (status >= 500) {
          return new Error(`PixelLab API error: ${data?.error || "Server error"}`);
        }

        return new Error(data?.error || `${defaultMessage} (status: ${status})`);
      } else if (axiosError.request) {
        console.error(`[PixelLab] No response received from API`);
        return new Error("Unable to reach PixelLab API. Please check your connection.");
      }
    }

    console.error(`[PixelLab] Unknown error:`, error);
    return new Error(`${defaultMessage}: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  /**
   * Format validation error without including base64 data
   */
  private formatValidationError(data: any): string {
    if (!data || !data.detail) {
      return "Invalid request parameters";
    }

    const errors = Array.isArray(data.detail) ? data.detail : [data.detail];
    const messages = errors.map((err: any) => {
      if (err.loc && err.msg) {
        const field = err.loc.join('.');
        let msg = `${field}: ${err.msg}`;
        
        // If the error involves reference_image, don't include the actual value
        if (field.includes('reference_image')) {
          msg += ' (image data provided)';
        } else if (err.input && typeof err.input === 'string' && err.input.length > 100) {
          msg += ` (value too long to display)`;
        }
        
        return msg;
      }
      return err.msg || JSON.stringify(err);
    });

    return messages.join('; ');
  }
}

