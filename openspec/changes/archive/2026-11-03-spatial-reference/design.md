## Context

Phase 0 introduced `ViewTransform`, scene `frame` modes and a single
artboard-space `RenderScene`. Spatial Reference must consume that transform
without becoming part of the artwork or changing the fit.

## Decisions

### D1: Configuration

`view.reference` is `{ enabled: false, ground: false }`. It is sanitized and
persisted with the view. Existing documents load with the reference off.

### D2: Reference geometry

`buildSpatialReference` builds world-space axes from the origin and an optional
ground plane, then projects each line through the scene's
`referenceTransform`. Axis labels sit at 86% of each axis to stay inside the
viewport. Degenerate axes (for example Z in an XY panel) are omitted.

### D3: Extent without frame feedback

The reference extent follows world bounds but is capped by the framed view so
a deep shape does not push axes off-screen. The cap is derived from the scene
frame at draw time and never feeds back into the frame. Toggling the reference
cannot change scale, position or bbox.

### D4: Frame policies

- `scene`: shared scene transform.
- `composition`: active spatial layer transform; planar active layers have no
  reference transform.
- `world`: world-anchored transform.

### D5: Canvas and Quad

Canvas draws ground, axes and labels before geometry, clipped to the artboard.
Quad builds one reference per panel. Axes appear in every panel; ground is
restricted to the 3D and XY panels because it collapses in XZ/YZ.

### D6: Export and capture

The reference is UI-only. `captureMode` skips it for PNG/GIF; SVG and plotter
never receive it. The existing export contract is unchanged.

### D7: Separation from guides

`view.guides` remains the artboard crosshair/margin passed. The spatial
reference is a world-space overlay with its own config and visual language.

## Risks / Trade-offs

- Painter ordering means the reference is behind geometry; labels can be
  partially hidden by dense shapes.
- The extent cap is presentation-aware, not a physical dimension.
- Composition mode anchors to the active spatial layer; a global origin is
  ambiguous when layers have independent frames.
- No numeric ground labels or snapping yet.

## Open Questions

- Should reference visibility be per-view or per-document long term?
- Should labels optionally render in front of geometry?
- When should the reference gain physical units or export opt-in?
