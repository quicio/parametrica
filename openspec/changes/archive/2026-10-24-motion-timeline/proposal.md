## Why

Animation currently means typing `time` expressions in a hidden text field.
The lab needs a visible, editable timeline so discoveries can become loops and
sequences.

## What Changes

- Add a timeline model: tracks per parameter path, keyframes, easing, loop.
- Add UI transport: play/pause/scrub, add/remove keyframes, easing select.
- Record a slider gesture into keyframes.
- Evaluate the document at a given time deterministically.
- Export a PNG frame sequence.
- Keep existing expression modulators compatible.

## Capabilities

### New Capabilities

- `motion-timeline-panel`: keyframe editing, playback, recording and frame
  export.

### Modified Capabilities

- None. The base specs define deterministic evaluation; this slice adds an
  animation surface.

## Impact

- new `src/lab/timeline.js`, `src/ui/widgets/TimelinePanel.js`
- `src/core/document.js`, `src/core/engine.js`, `src/animation/animatable.js`
- `src/export/` frame sequence
- tests + e2e + docs

## Non-goals

- No audio.
- No video encoding (PNG sequence first).
- No motion blur.
- No keyframe editing of operator structure.
