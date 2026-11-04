## 1. Descriptor

- [x] 1.1 Add a pure viewport descriptor for 3D/XY/XZ/YZ with axis ids, labels
      and direction signs.
- [x] 1.2 Add orthographic inverse mapping for cursor world coordinates.
- [x] 1.3 Add auto/manual tick-step generation.
  - Verify: unit tests for axis mapping, signs, inverse coordinates, tick
    spacing and invalid step fallback.

## 2. Rendering

- [x] 2.1 Draw axes labels, ticks, values and optional grid per panel.
- [x] 2.2 Clip overlays per panel and skip them in capture mode.
- [x] 2.3 Route Quad pointer coordinates to the panel under the cursor.
  - Verify: renderer tests and e2e for single/Quad panels and export isolation.

## 3. Look and config

- [x] 3.1 Add Coordinates section with Reference, Ground, grid, ticks, cursor,
      step and unit-display controls.
- [x] 3.2 Move Reference/Ground out of Canvas and migrate section state.
- [x] 3.3 Add optional `view.coordinates` defaults/sanitization.
  - Verify: unit round-trip, old document compatibility, e2e controls and
    persisted state.

## 4. Acceptance

- [x] 4.1 Document axis mapping, tick semantics, unit display and limitations.
- [x] 4.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- XY/XZ/YZ panels expose correct horizontal, vertical and depth axes.
- Axis signs, numeric ticks and units are truthful in every panel.
- Cursor readout reports the two in-plane coordinates and marks depth unknown.
- Reference, Ground and coordinate controls live in Coordinates.
- Geometry, frame, bbox, SurfaceMapping, picking and exports are unchanged.
- 3D keeps axes/origin only; it does not invent world-scale ticks or depth.
