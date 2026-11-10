declare module 'gifenc/dist/gifenc.esm.js' {
  export interface GifWriteOptions {
    palette?: number[][];
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
    first?: boolean;
  }

  export interface GifEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, options?: GifWriteOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(): GifEncoderInstance;
  export function quantize(rgba: Uint8Array, maxColors: number, options?: { format?: string }): number[][];
  export function applyPalette(rgba: Uint8Array, palette: number[][]): Uint8Array;
}
