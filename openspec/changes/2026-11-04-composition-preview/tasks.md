## 1. Preview

- [x] 1.1 Add size-aware preview rendering/cache.
- [x] 1.2 Use 224 px for Start With and keep 96 px for the preset browser.
- [x] 1.3 Verify equal card dimensions and placeholder fallback.
  - Verify: unit preview-key tests and e2e natural-size/fallback checks.

## 2. Acceptance

- [x] 2.1 Document preview sizes and cache behavior.
- [x] 2.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Composition preview is rendered at 224 px for Start With.
- Preset browser previews remain 96 px.
- Card dimensions remain equal.
- Preview failure falls back without blocking selection.
- No document mutation or new dependency.
