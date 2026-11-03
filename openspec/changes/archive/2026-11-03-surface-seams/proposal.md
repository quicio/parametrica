## Why

SurfaceMapping declares closed axes, normal/reverse seams and twists, but the
canvas does not show them. Users cannot distinguish domain borders from seams
or see where a twist is declared.

## What Changes

- Add a pure seam-overlay derivation from SurfaceMapping domain/faces.
- Draw open borders, declared seams and reverse/twist seams with distinct
  styles.
- Add a compact legend and Canvas toggle.
- Keep the overlay UI-only, single-Canvas and out of exports.
- Explicitly avoid claiming geometric continuity or drawing seam pairing /
  twist orientation not present in the data.

## Capabilities

### Modified Capabilities

- `surface-inspection`: border/seam/twist visualization and legend.

## Impact

- New: `src/interaction/seamOverlay.js`, `src/ui/SeamLegend.js`.
- Modified: App, Controls, P5 adapter, CSS, tests and docs.
- No geometry, SurfaceMapping, Projection Source, ViewTransform, RenderScene,
  frame, bbox or export change.

## Non-goals

- No seam pairing/orientation, geometric continuity analysis, UV unwrap, CAD.
- No Quad overlay/picking.
- No export or serialization of seam data.
