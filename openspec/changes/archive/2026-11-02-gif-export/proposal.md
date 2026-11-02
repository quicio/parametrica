## Why

The motion timeline already exports a deterministic ZIP of PNG frames, but a
short discovered loop is awkward to share: the recipient has to unpack the
archive and stitch the frames. A GIF is the natural single-file artifact for a
loop, and the workbench already has the timeline, FPS and renderer capture
needed to produce one.

## What Changes

- Add `src/export/gif.js`: a small, DOM-free GIF encoder wrapper with a global
  palette, deterministic frame delays and a hard frame cap.
- Add `P5Adapter.artboardImageData(maxSize)` for direct, aspect-preserving
  RGBA capture from the current artboard without a PNG round-trip.
- Add `Exporter.exportGIF({ duration, fps, maxSize, loop, onProgress })`.
  It samples the timeline with the existing `frameTimes()` contract, restores
  the playhead/playback state in `finally`, and downloads one `.gif`.
- Add **Export GIF** next to **Export frames** in the Timeline panel. It uses
  the current duration/FPS, a 360 px maximum side, and reports progress.
- Add unit tests for encoding, frame caps and header validation; add an e2e
  flow for the button, download and status.
- Document the format, defaults and limitations in README/SPEC/architecture.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `motion-timeline-panel`: adds GIF export alongside the deterministic PNG
  frame sequence, with the same timeline duration/FPS contract.

## Impact

- New: `src/export/gif.js`.
- Modified: `src/export/Exporter.js`, `src/render/p5/P5Adapter.js`,
  `src/ui/widgets/TimelinePanel.js`, `style.css`, `package.json`.
- Tests: `test/lab.smoke.mjs`, `e2e/ui.spec.js`.
- Docs: README, SPEC.md, `docs/architecture.md`, `openspec/specs`.
- Dependency: `gifenc` (lazy-loaded, no runtime network).
- No document version change. No timeline schema change.

## Non-goals

- No WebM/MP4/video export.
- No per-frame palette editor, dithering controls or transparency editor.
- No cloud upload or share links.
- No server-side encoding.
- No change to the existing PNG-sequence manifest.
