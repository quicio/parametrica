## 1. Model

- [x] 1.1 Add `view.passStyle` defaults/sanitization.
- [x] 1.2 Define pass support metadata.
- [x] 1.3 Resolve pass style in render context.

## 2. UI and exports

- [x] 2.1 Add per-pass color/width controls and reset.
- [x] 2.2 Disable unsupported/inactive controls with reasons.
- [x] 2.3 Preserve SVG/PNG; ignore in STL.
  - Verify: unit resolution/sanitization; e2e controls, SVG and defaults.

## 3. Acceptance

- [x] 3.1 Document scope and supported passes.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Per-pass color/width overrides are optional and sanitized.
- Defaults preserve current rendering and exports.
- Unsupported passes are explicit.
- No geometry, STL, camera or pass math change.
