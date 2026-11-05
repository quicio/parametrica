## 1. Defaults

- [x] 1.1 Change document, view and exporter defaults to 0.5.
- [x] 1.2 Update unit/e2e assertions and docs.
  - Verify: default-style unit and stroke-width e2e.

## 2. Acceptance

- [x] 2.1 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- New documents use stroke width 0.5.
- Existing stored widths are preserved.
- Export fallbacks use 0.5.
