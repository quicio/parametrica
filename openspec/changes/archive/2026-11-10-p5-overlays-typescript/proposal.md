## Why

`render/p5/overlays` owns quad panels, coordinate grids/ticks, image underlay,
seam and inspection overlays, spatial reference and guides. It is the largest
p5-adjacent module after `P5Adapter` and sits between typed scene/view contracts
and the concrete canvas API.

## What Changes

- Convert `render/p5/overlays.js` to `.ts`.
- Add a structural p5 overlay context, overlay adapter and option contracts.
- Type quad panels, coordinate descriptors/ticks, underlays, seam/inspection
  overlays, reference and guides.
- Keep the JS compatibility re-export.

## Out of Scope

- `P5Adapter`, `ProductPreview`, interaction builders and UI.
- Changing overlay drawing, layout, clipping or hit-test behavior.
