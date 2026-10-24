/**
 * timeline.js — versioned keyframe timeline.
 *
 * Tracks are keyed by parameter path and layer index. Resolution is pure and
 * deterministic: base value → timeline keyframe → explicit time expression.
 */

export const TIMELINE_VERSION = 1;
export const DEFAULT_DURATION = 6;
export const DEFAULT_FPS = 24;
export const EASINGS = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'step'];

export function createTimeline(overrides = {}) {
  return {
    version: TIMELINE_VERSION,
    duration: Number(overrides.duration) || DEFAULT_DURATION,
    loop: overrides.loop === true,
    tracks: Array.isArray(overrides.tracks) ? structuredClone(overrides.tracks) : [],
  };
}

export function sanitizeTimeline(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const duration = Math.max(0.1, Math.min(600, Number(source.duration) || DEFAULT_DURATION));
  const tracks = [];
  for (const track of Array.isArray(source.tracks) ? source.tracks.slice(0, 64) : []) {
    if (!track || typeof track.path !== 'string' || !track.path.trim()) continue;
    const layer = Math.max(0, Math.min(15, Math.floor(Number(track.layer) || 0)));
    const keyframes = [];
    for (const frame of Array.isArray(track.keyframes) ? track.keyframes.slice(0, 128) : []) {
      const time = Number(frame?.time);
      const value = Number(frame?.value);
      if (!Number.isFinite(time) || !Number.isFinite(value)) continue;
      keyframes.push({
        time: Math.max(0, Math.min(duration, Math.round(time * 1e6) / 1e6)),
        value,
        easing: EASINGS.includes(frame.easing) ? frame.easing : 'linear',
      });
    }
    keyframes.sort((a, b) => a.time - b.time);
    const unique = [];
    for (const frame of keyframes) {
      if (unique.length && Math.abs(unique[unique.length - 1].time - frame.time) < 1e-9) {
        unique[unique.length - 1] = frame;
      } else unique.push(frame);
    }
    if (unique.length) tracks.push({ path: track.path.trim().slice(0, 160), layer, keyframes: unique });
  }
  return { version: TIMELINE_VERSION, duration, loop: Boolean(source.loop), tracks };
}

export function trackKey(track) {
  return `${track.layer}:${track.path}`;
}

export function findTrack(timeline, path, layer = 0) {
  return timeline?.tracks?.find((track) => track.path === path && (track.layer ?? 0) === layer) ?? null;
}

export function upsertKeyframe(timeline, { path, layer = 0, time, value, easing = 'linear' }) {
  if (!timeline) return null;
  const safeTime = Math.max(0, Math.min(timeline.duration, Number(time) || 0));
  const safeValue = Number(value);
  if (!Number.isFinite(safeValue)) return null;
  let track = findTrack(timeline, path, layer);
  if (!track) {
    track = { path, layer, keyframes: [] };
    timeline.tracks.push(track);
  }
  const frame = { time: safeTime, value: safeValue, easing: EASINGS.includes(easing) ? easing : 'linear' };
  const index = track.keyframes.findIndex((item) => Math.abs(item.time - safeTime) < 1e-9);
  if (index >= 0) track.keyframes[index] = frame;
  else track.keyframes.push(frame);
  track.keyframes.sort((a, b) => a.time - b.time);
  return frame;
}

export function removeKeyframe(timeline, { path, layer = 0, time }) {
  const track = findTrack(timeline, path, layer);
  if (!track) return false;
  const before = track.keyframes.length;
  track.keyframes = track.keyframes.filter((frame) => Math.abs(frame.time - time) > 1e-9);
  if (!track.keyframes.length) {
    timeline.tracks = timeline.tracks.filter((item) => item !== track);
  }
  return track.keyframes.length !== before;
}

export function removeTrack(timeline, path, layer = 0) {
  const before = timeline.tracks.length;
  timeline.tracks = timeline.tracks.filter((track) => !(track.path === path && (track.layer ?? 0) === layer));
  return timeline.tracks.length !== before;
}

/**
 * Resolve a timeline value for a path/layer at time. Returns null when no
 * track exists. Looping is applied when the timeline is loop-enabled.
 */
export function resolveTimelineValue(timeline, path, layer = 0, time = 0) {
  const track = findTrack(timeline, path, layer);
  if (!track || !track.keyframes.length) return null;
  let t = Number(time) || 0;
  if (timeline.loop && timeline.duration > 0) {
    t = ((t % timeline.duration) + timeline.duration) % timeline.duration;
  } else {
    t = Math.max(0, Math.min(timeline.duration, t));
  }
  const frames = track.keyframes;
  if (t <= frames[0].time) return frames[0].value;
  if (t >= frames[frames.length - 1].time) return frames[frames.length - 1].value;
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (t < a.time || t > b.time) continue;
    const span = b.time - a.time;
    const u = span > 0 ? (t - a.time) / span : 0;
    const shaped = ease(a.easing, u);
    return a.value + (b.value - a.value) * shaped;
  }
  return frames[frames.length - 1].value;
}

/** Frame times for a duration/fps pair; frame 0 is included. */
export function frameTimes(duration, fps) {
  const d = Math.max(0.1, Number(duration) || DEFAULT_DURATION);
  const f = Math.max(1, Math.min(120, Number(fps) || DEFAULT_FPS));
  const count = Math.max(1, Math.round(d * f));
  return Array.from({ length: count }, (_, i) => Number((i / f).toFixed(6)));
}

export function ease(kind, u) {
  const t = Math.max(0, Math.min(1, u));
  switch (kind) {
    case 'ease-in': return t * t;
    case 'ease-out': return 1 - (1 - t) * (1 - t);
    case 'ease-in-out': return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
    case 'step': return 0;
    case 'linear':
    default: return t;
  }
}
