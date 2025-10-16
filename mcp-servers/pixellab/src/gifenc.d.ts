declare module 'gifenc' {
  export interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: { palette?: number[][]; delay?: number; dispose?: number }
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(): GIFEncoderInstance;
  
  export function quantize(
    rgba: Uint8Array | Buffer,
    maxColors: number,
    options?: any
  ): number[][];
  
  export function applyPalette(
    rgba: Uint8Array | Buffer,
    palette: number[][]
  ): Uint8Array;
}

