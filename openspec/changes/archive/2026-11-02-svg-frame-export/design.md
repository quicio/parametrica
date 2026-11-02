## Context

`TimelinePanel.exportFrames()` renders each frame to PNG, stores bytes and a
manifest, and downloads a ZIP. `Exporter` now has a pass-recorded SVG builder
and a `buildSVGFromCurrent()` method is the natural frame source.

## Decisions

### D1: Reuse the current SVG builder

A frame is exactly `Exporter.buildSVGFromCurrent()` at an evaluated time. This
keeps the SVG sequence aligned with the single-frame export: active passes,
overlays, blend, solid/linear/radial fills and artboard all stay faithful.

### D2: ZIP + manifest

The archive contains:

```txt
frame-000.svg
frame-001.svg
...
manifest.json
```

The manifest mirrors the PNG sequence contract:

```json
{
  "version": 1,
  "format": "svg",
  "duration": 6,
  "fps": 24,
  "frameCount": 144,
  "frames": [{ "file": "frame-000.svg", "time": 0, "omitted": [] }]
}
```

Per-frame `omitted` records raster-only features (currently Signed Distance).

### D3: Perform owns temporal export

The action lives beside PNG frames and GIF in Timeline, inside Perform. KEEP
remains final-artifact export (single SVG/PNG/JSON) and does not duplicate the
timeline controls.

### D4: State restoration

The export pauses playback, samples, then restores the original time and
playing state in `finally`, matching PNG/GIF behavior.

## Risks / Trade-offs

- Large timelines produce large archives; the UI status reports the frame
  count and yields between batches, matching the existing frame export.
- SVG frames may include per-frame gradient definitions; each frame is a
  standalone SVG, so duplicate IDs across files are harmless.
- Raster-only SDF is listed in each manifest frame instead of silently missing.

## Open Questions

- Should a later version offer animated SVG/SMIL as an alternative to a ZIP?
- Should frame size be selectable? The SVG stays at artboard resolution.
