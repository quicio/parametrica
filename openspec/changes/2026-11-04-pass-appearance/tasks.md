## 1. Model

- [ ] 1.1 Add `view.passStyle` defaults/sanitization.
- [ ] 1.2 Define pass support metadata.
- [ ] 1.3 Resolve pass style in render context.

## 2. UI and exports

- [ ] 2.1 Add per-pass color/width controls and reset.
- [ ] 2.2 Disable unsupported/inactive controls with reasons.
- [ ] 2.3 Preserve SVG/PNG; ignore in STL.
  - Verify: unit resolution/sanitization; e2e controls, SVG and defaults.

## 3. Acceptance

- [ ] 3.1 Document scope and supported passes.
- [ ] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Per-pass color/width overrides are optional and sanitized.
- Defaults preserve current rendering and exports.
- Unsupported passes are explicit.
- No geometry, STL, camera or pass math change.
