/** Versioned keyframe timeline. */

export const TIMELINE_VERSION = 1;
export const DEFAULT_DURATION = 6;
export const DEFAULT_FPS = 24;
export const EASINGS = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'step'];

export interface TimelineKeyframe {
  time: number;
  value: number;
  easing: string;
}
export interface TimelineTrack {
  path: string;
  layer: number;
  keyframes: TimelineKeyframe[];
}
export interface Timeline {
  version: number;
  duration: number;
  loop: boolean;
  tracks: TimelineTrack[];
}
export interface KeyframeInput {
  path: string;
  layer?: number;
  time: unknown;
  value: unknown;
  easing?: string;
}

export function createTimeline(overrides: Partial<Timeline> = {}): Timeline {
  return {
    version: TIMELINE_VERSION,
    duration: Number(overrides.duration) || DEFAULT_DURATION,
    loop: overrides.loop === true,
    tracks: Array.isArray(overrides.tracks) ? structuredClone(overrides.tracks) : [],
  };
}

export function sanitizeTimeline(raw: unknown): Timeline {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const duration = Math.max(0.1, Math.min(600, Number(source.duration) || DEFAULT_DURATION));
  const tracks: TimelineTrack[] = [];
  const rawTracks = Array.isArray(source.tracks) ? source.tracks.slice(0, 64) : [];
  for (const track of rawTracks) {
    if (!track || typeof track !== 'object') continue;
    const trackSource = track as Record<string, unknown>;
    if (typeof trackSource.path !== 'string' || !trackSource.path.trim()) continue;
    const layer = Math.max(0, Math.min(15, Math.floor(Number(trackSource.layer) || 0)));
    const keyframes: TimelineKeyframe[] = [];
    const rawFrames = Array.isArray(trackSource.keyframes) ? trackSource.keyframes.slice(0, 128) : [];
    for (const frame of rawFrames) {
      if (!frame || typeof frame !== 'object') continue;
      const frameSource = frame as Record<string, unknown>;
      const time = Number(frameSource.time);
      const value = Number(frameSource.value);
      if (!Number.isFinite(time) || !Number.isFinite(value)) continue;
      keyframes.push({
        time: Math.max(0, Math.min(duration, Math.round(time * 1e6) / 1e6)),
        value,
        easing: EASINGS.includes(frameSource.easing as string) ? frameSource.easing as string : 'linear',
      });
    }
    keyframes.sort((a, b) => a.time - b.time);
    const unique: TimelineKeyframe[] = [];
    for (const frame of keyframes) {
      const last = unique[unique.length - 1];
      if (last && Math.abs(last.time - frame.time) < 1e-9) {
        unique[unique.length - 1] = frame;
      } else unique.push(frame);
    }
    if (unique.length) tracks.push({ path: trackSource.path.trim().slice(0, 160), layer, keyframes: unique });
  }
  return { version: TIMELINE_VERSION, duration, loop: Boolean(source.loop), tracks };
}

export function trackKey(track: TimelineTrack): string {
  return `${track.layer}:${track.path}`;
}

export function findTrack(timeline: Timeline | null | undefined, path: string, layer = 0): TimelineTrack | null {
  return timeline?.tracks?.find((track) => track.path === path && (track.layer ?? 0) === layer) ?? null;
}

export function upsertKeyframe(timeline: Timeline | null | undefined, { path, layer = 0, time, value, easing = 'linear' }: KeyframeInput): TimelineKeyframe | null {
  if (!timeline) return null;
  const safeTime = Math.max(0, Math.min(timeline.duration, Number(time) || 0));
  const safeValue = Number(value);
  if (!Number.isFinite(safeValue)) return null;
  let track = findTrack(timeline, path, layer);
  if (!track) {
    track = { path, layer, keyframes: [] };
    timeline.tracks.push(track);
  }
  const frame: TimelineKeyframe = { time: safeTime, value: safeValue, easing: EASINGS.includes(easing) ? easing : 'linear' };
  const index = track.keyframes.findIndex((item) => Math.abs(item.time - safeTime) < 1e-9);
  if (index >= 0) track.keyframes[index] = frame;
  else track.keyframes.push(frame);
  track.keyframes.sort((a, b) => a.time - b.time);
  return frame;
}

export function removeKeyframe(timeline: Timeline, { path, layer = 0, time }: { path: string; layer?: number; time: number }): boolean {
  const track = findTrack(timeline, path, layer);
  if (!track) return false;
  const before = track.keyframes.length;
  track.keyframes = track.keyframes.filter((frame) => Math.abs(frame.time - time) > 1e-9);
  if (!track.keyframes.length) {
    timeline.tracks = timeline.tracks.filter((item) => item !== track);
  }
  return track.keyframes.length !== before;
}

export function removeTrack(timeline: Timeline, path: string, layer = 0): boolean {
  const before = timeline.tracks.length;
  timeline.tracks = timeline.tracks.filter((track) => !(track.path === path && (track.layer ?? 0) === layer));
  return timeline.tracks.length !== before;
}

/**
 * Resolve a timeline value for a path/layer at time. Returns null when no
 * track exists. Looping is applied when the timeline is loop-enabled.
 */
export function resolveTimelineValue(timeline: Timeline, path: string, layer = 0, time = 0): number | null {
  const track = findTrack(timeline, path, layer);
  if (!track || !track.keyframes.length) return null;
  let t = Number(time) || 0;
  if (timeline.loop && timeline.duration > 0) {
    t = ((t % timeline.duration) + timeline.duration) % timeline.duration;
  } else {
    t = Math.max(0, Math.min(timeline.duration, t));
  }
  const frames = track.keyframes;
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (!first || !last) return null;
  if (t <= first.time) return first.value;
  if (t >= last.time) return last.value;
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (!a || !b) continue;
    if (t < a.time || t > b.time) continue;
    const span = b.time - a.time;
    const u = span > 0 ? (t - a.time) / span : 0;
    const shaped = ease(a.easing, u);
    return a.value + (b.value - a.value) * shaped;
  }
  return last.value;
}

/** Frame times for a duration/fps pair; frame 0 is included. */
export function frameTimes(duration: unknown, fps: unknown): number[] {
  const d = Math.max(0.1, Number(duration) || DEFAULT_DURATION);
  const f = Math.max(1, Math.min(120, Number(fps) || DEFAULT_FPS));
  const count = Math.max(1, Math.round(d * f));
  return Array.from({ length: count }, (_, i) => Number((i / f).toFixed(6)));
}

export function ease(kind: string, u: number): number {
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
