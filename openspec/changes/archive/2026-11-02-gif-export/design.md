## Context

The timeline stores duration, loop and keyframe tracks. `TimelinePanel`
already renders a deterministic frame sequence with `frameTimes(duration,
fps)` and downloads it as a ZIP. GIF export should reuse that sampling
contract, not introduce a second time model.

The camera/frame pipeline is canvas-based. `P5Adapter.renderNow()` draws a
capture-safe frame (reference underlay excluded), and `artboardDataURL()`
already crops the artboard at its native aspect ratio.

## Decisions

### D1: Browser-side encoding with `gifenc`

Use `gifenc` for LZW/GIF89a encoding. It is dependency-free, small, ESM and
works in both the browser and Node tests. Import it lazily from the exporter so
it stays out of the initial bundle.

### D2: One global palette per export

Sample up to ~150k pixels spread across every frame, quantize once to 256
colors, and reuse that palette for all frames. This avoids palette flicker
between frames and keeps the file smaller than per-frame color tables. The
background and line colors are simple enough for the built-in quantizer.

### D3: Scale at capture, not at encode

Capture each frame at a maximum side of 360 px. The artboard aspect ratio is
preserved and the background is painted before drawing, so the GIF always has
an opaque, consistent field. Encoding at 360 px keeps memory and download size
reasonable; the full-resolution PNG path remains available.

### D4: Deterministic frame plan and hard cap

Reuse `frameTimes()` and the timeline FPS, capped at 50 FPS for GIF. Delays
are rounded to the format's centisecond resolution. Exports above 240 frames
are rejected with a visible status instead of silently dropping frames or
freezing the tab.

### D5: Restore the playhead

Export pauses playback, renders frames, then restores the original time and
playing state in `finally`. Exported frames never leave the document mutated.

## Risks / Trade-offs

- GIF is limited to 256 colors and no dithering; it is intended for vector-like
  line art, not photographs.
- A 240-frame, 360 px export still creates a sizable file. The status and cap
  surface this rather than hiding it.
- GIF timing is quantized to 10 ms, so non-divisor FPS values are approximate.

## Open Questions

- Should a future version expose size/FPS controls directly in the Export
  section instead of reusing the Timeline controls?
- Should frame-sequence and GIF share a progress modal for long exports?
