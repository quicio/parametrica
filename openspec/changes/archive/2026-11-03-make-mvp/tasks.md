## 1. Mode and source

- [x] 1.1 Add Fabricate mode and panel shell.
- [x] 1.2 Resolve active closed Mesh/Solid and explain unavailable sources.
- [x] 1.3 Show health, counts, volume and physical bbox.

## 2. Units and export

- [x] 2.1 Expose physical scale/units and require a valid scale.
- [x] 2.2 Enable STL export only after validation.
- [x] 2.3 Surface validation errors and self-intersection limitation.
  - Verify: unit tests for source resolution/health; e2e valid export, open
    surface rejection, unitless gating and mode switching.

## 3. Acceptance

- [x] 3.1 Document the mode, limitations and unit semantics.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Fabricate mode is read-only and does not mutate geometry.
- Only validated closed Mesh/Solid can be exported.
- Physical dimensions and volume are visible in explicit units.
- STL export uses Phase 4C and is gated by validation.
- No CSG, repair, caps, materials, slicer, 3MF or multi-body.
- Existing render, inspection and artboard exports remain unchanged.
