/**
 * Type definitions for PixelLab API and MCP tools
 */

export type SpriteSize = "16x16" | "32x32" | "64x64" | "128x128";

export interface GenerateSpriteParams {
  prompt: string;
  size: SpriteSize;
  style?: string;
  seed?: number;
}

export interface GenerateSpriteResponse {
  spriteId: string;
  imageUrl: string;
  prompt: string;
  size: SpriteSize;
  metadata?: Record<string, any>;
}

// Pixflux image generation types
export interface ImageSize {
  width: number;
  height: number;
}

export type Detail = "low detail" | "medium detail" | "highly detailed";
export type Direction = "north" | "north-east" | "east" | "south-east" | "south" | "south-west" | "west" | "north-west";
export type Outline = "single color black outline" | "single color outline" | "selective outline" | "lineless";
export type BackgroundRemovalTask = "remove_simple_background" | "remove_complex_background";

export interface Base64Image {
  type: "base64";
  base64: string;
  format: string;
}

export interface GenerateImagePixfluxParams {
  description: string;
  image_size: ImageSize;
  background_removal_task?: BackgroundRemovalTask;
  color_image?: Base64Image;
  detail?: Detail;
  direction?: Direction;
  init_image?: Base64Image;
  init_image_strength?: number;
  isometric?: boolean;
  negative_description?: string;
  no_background?: boolean;
  outline?: Outline;
  seed?: number;
}

export interface GenerateImagePixfluxResponse {
  imageUrl: string;
  description: string;
  image_size: ImageSize;
  metadata?: Record<string, any>;
}

export interface RotateSpriteParams {
  spriteId: string;
  angles: number[];
}

export interface RotateSpriteResponse {
  spriteId: string;
  spriteSheetUrl: string;
  angles: number[];
  metadata?: Record<string, any>;
}

export interface AnimateSpriteParams {
  spriteId: string;
  fps?: number;
  loop?: boolean;
  description?: string;
  animationType?: string;
}

export interface AnimateSpriteResponse {
  spriteId: string;
  animationUrl: string;
  fps: number;
  loop: boolean;
  metadata?: Record<string, any>;
}

export interface PixelLabError {
  error: string;
  code?: string;
  details?: any;
}

