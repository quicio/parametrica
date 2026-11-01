/**
 * application/animationController.js — transport and clock only.
 */

export class AnimationController {
  /** @returns {number|null} next time, or null when paused */
  advance(animation, deltaMs) {
    if (!animation?.playing) return null;
    const dt = Math.min(0.1, Math.max(0, deltaMs) / 1000);
    return (Number(animation.time) || 0) + dt * (Number(animation.speed) || 1);
  }
}
