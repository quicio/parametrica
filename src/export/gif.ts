/** Deterministic GIF encoding for timeline exports. */

import { GIFEncoder, quantize, applyPalette } from 'gifenc/dist/gifenc.esm.js';
import { frameTimes } from '../animation/timeline.ts';

export const GIF_MAX_FRAMES = 240;
export const GIF_MAX_FPS = 50;
export const GIF_MAX_SIZE = 360;
export const GIF_MAX_COLORS = 256;

export interface GifFrame {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

export interface GifOptions {
  fps?: number;
  loop?: boolean;
  maxColors?: number;
}

/**
 * Frame timestamps for a GIF export. The hard cap prevents a long or
 * high-FPS timeline from allocating an unbounded frame buffer.
 */
export function gifFrameTimes(duration: number, fps: number): number[] {
  const safeFps = Math.min(GIF_MAX_FPS, Math.max(1, Number(fps) || 12));
  const times = frameTimes(duration, safeFps) as number[];
  if (times.length > GIF_MAX_FRAMES) {
    throw new Error(
      `GIF export is limited to ${GIF_MAX_FRAMES} frames; reduce duration or FPS`,
    );
  }
  return times;
}

export function encodeGIF(frames: ReadonlyArray<GifFrame>, {
  fps = 12,
  loop = true,
  maxColors = GIF_MAX_COLORS,
}: GifOptions = {}): Uint8Array {
  if (!Array.isArray(frames) || !frames.length) {
    throw new Error('GIF export needs at least one frame');
  }
  if (frames.length > GIF_MAX_FRAMES) {
    throw new Error(`GIF export is limited to ${GIF_MAX_FRAMES} frames`);
  }
  const first = validateFrame(frames[0], 0);
  const width = first.width;
  const height = first.height;
  for (let index = 1; index < frames.length; index++) {
    const frame = validateFrame(frames[index], index);
    if (frame.width !== width || frame.height !== height) {
      throw new Error('GIF frames must all share the same dimensions');
    }
  }

  const colors = Math.max(2, Math.min(GIF_MAX_COLORS, Math.floor(Number(maxColors) || GIF_MAX_COLORS)));
  const palette = quantize(buildPaletteSample(frames), colors);
  if (!palette.length) throw new Error('GIF palette could not be built');

  const gif = GIFEncoder();
  const safeFps = Math.min(GIF_MAX_FPS, Math.max(1, Number(fps) || 12));
  const delay = Math.max(20, Math.round(1000 / safeFps));
  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index];
    if (!frame) continue;
    const indexed = applyPalette(frame.data as Uint8Array, palette);
    const options: { delay: number; palette?: number[][]; repeat?: number } = { delay };
    if (index === 0) {
      options.palette = palette;
      options.repeat = loop ? 0 : -1;
    }
    gif.writeFrame(indexed, width, height, options);
  }
  gif.finish();
  return gif.bytes();
}

function validateFrame(frame: GifFrame | undefined, index: number): GifFrame {
  if (!frame || !Number.isInteger(frame.width) || !Number.isInteger(frame.height)
    || frame.width < 1 || frame.height < 1) {
    throw new Error(`GIF frame ${index} has invalid dimensions`);
  }
  const expected = frame.width * frame.height * 4;
  if (!frame.data || frame.data.length !== expected) {
    throw new Error(`GIF frame ${index} must contain ${expected} RGBA bytes`);
  }
  return frame;
}

/**
 * Sample pixels across every frame so the shared palette represents the whole
 * sequence, not just the first frame. The cap keeps quantize time bounded.
 */
function buildPaletteSample(frames: ReadonlyArray<GifFrame>, maxSamples = 150_000): Uint8Array {
  const perFrame = Math.max(1, Math.floor(maxSamples / frames.length));
  const sample = new Uint8Array(Math.min(maxSamples, frames.length * perFrame) * 4);
  let offset = 0;
  for (const frame of frames) {
    const pixels = frame.width * frame.height;
    const step = Math.max(1, Math.floor(pixels / perFrame));
    let taken = 0;
    for (let pixel = 0; pixel < pixels && taken < perFrame; pixel += step) {
      if (offset + 4 > sample.length) break;
      const source = pixel * 4;
      sample[offset] = frame.data[source] ?? 0;
      sample[offset + 1] = frame.data[source + 1] ?? 0;
      sample[offset + 2] = frame.data[source + 2] ?? 0;
      sample[offset + 3] = frame.data[source + 3] ?? 0;
      offset += 4;
      taken++;
    }
    if (offset + 4 > sample.length) break;
  }
  return sample.subarray(0, offset);
}
