## Why

The timeline can already export a PNG frame sequence and a GIF. SVG is the
remaining temporal format: it preserves vector geometry and the full pass
recorder, but there is no way to obtain a frame-by-frame SVG sequence.

## What Changes

- Add an **Export SVG frames** action to Timeline in Perform.
- Sample the timeline with the existing duration/FPS `frameTimes()` contract.
- For each frame, call the current SVG builder and store `frame-NNN.svg`.
- Add `manifest.json` with duration, FPS, frame count, file/time mapping and
  per-frame raster-only omissions.
- Restore the playhead and playback state in `finally`.
- Update tests, docs, roadmap and audit.

## Capabilities

### New Capabilities

- `svg-frame-export`: deterministic SVG frame sequence and manifest.

### Modified Capabilities

- None.

## Impact

- Modified: `src/export/Exporter.js` (extract current SVG builder),
  `src/ui/widgets/TimelinePanel.js`, `style.css`.
- Tests: `e2e/ui.spec.js`.
- Docs: README, SPEC §17, architecture, audit, roadmap.
- No document, preset, notebook or session format change.
- No plotter, MAKE or new rendering capability.

## Non-goals

- No animated SVG/SMIL timeline format.
- No plotter-ready SVG.
- No video export.
- No change to the PNG ZIP or GIF contracts.
- No new render passes or fill features.
