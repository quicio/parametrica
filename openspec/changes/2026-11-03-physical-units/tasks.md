## 1. Model

- [ ] 1.1 Add optional `view.units` defaults/sanitization.
- [ ] 1.2 Preserve old unitless documents and exports.
- [ ] 1.3 Add pure conversion helpers for world/artboard mm.

## 2. UI and exports

- [ ] 2.1 Add explicit unit/scale controls and physical size readout.
- [ ] 2.2 Apply physical page size to plotter export.
- [ ] 2.3 Require physical world scale for fabrication export claims.
  - Verify: unit tests for conversions, invalid values, round-trip and no
    geometry mutation; e2e unit controls and plotter output.

## 3. Acceptance

- [ ] 3.1 Document unit semantics and limitations.
- [ ] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Old documents remain unitless and unchanged.
- Physical units are explicit, finite and positive.
- No geometry, frame, bbox or mapping is rescaled.
- Plotter and fabrication paths use the correct conversion.
- No STL/3MF or MAKE UI is introduced.
