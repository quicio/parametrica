## 1. Preview

- [ ] 1.1 Add size-aware preview rendering/cache.
- [ ] 1.2 Use 224 px for Start With and keep 96 px for the preset browser.
- [ ] 1.3 Verify equal card dimensions and placeholder fallback.
  - Verify: unit preview-key tests and e2e natural-size/fallback checks.

## 2. Acceptance

- [ ] 2.1 Document preview sizes and cache behavior.
- [ ] 2.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Composition preview is rendered at 224 px for Start With.
- Preset browser previews remain 96 px.
- Card dimensions remain equal.
- Preview failure falls back without blocking selection.
- No document mutation or new dependency.
