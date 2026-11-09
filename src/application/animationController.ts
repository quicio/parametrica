/** Application animation transport and clock. */

export interface AnimationLike {
  playing?: boolean;
  time?: unknown;
  speed?: unknown;
  [key: string]: unknown;
}

export class AnimationController {
  /** @returns next time, or null when paused */
  advance(animation: AnimationLike | null | undefined, deltaMs: unknown): number | null {
    if (!animation?.playing) return null;
    const dt = Math.min(0.1, Math.max(0, Number(deltaMs)) / 1000);
    return (Number(animation.time) || 0) + dt * (Number(animation.speed) || 1);
  }
}
