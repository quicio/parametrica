## Why

Coordinates are useful in XY/XZ/YZ, but in 3D the cursor readout is unavailable.
Users inspecting a surface cannot pin a coordinate or read a world XYZ point
outside the Surface Inspector.

## What Changes

- Add docked/pinned coordinate readout.
- In 3D, read world XYZ from an existing surface hit when available.
- Keep orthographic readout as two in-plane values plus unknown depth.
- Reuse picking; do not invent depth.
- Keep the overlay UI-only and excluded from exports.

## Capabilities

### New Capabilities

- `coordinates-panel`: pinned coordinate readout and 3D hit mode.

### Modified Capabilities

- `viewport-coordinates`: 3D hit readout and pin behavior.

## Impact

- Coordinates section controls
- P5Adapter/renderer readout routing
- Surface picker reuse
- Unit/e2e tests
- No geometry, mapping or export change.

## Non-goals

- No measurement tools.
- No snapping.
- No depth inference on empty space.
- No new renderer.
