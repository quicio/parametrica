## 1. Startup

- [x] 1.1 Load and sanitize the last session before initial evaluation.
- [x] 1.2 Adopt it as the startup document and history baseline.
- [x] 1.3 Remove the blocking recovery banner and show a transient notice.
  - Verify: e2e reload restores generator, params and styles without a banner.

## 2. Default style

- [x] 2.1 Set default stroke width and strokeWeight to 1.
- [x] 2.2 Update exporter fallbacks and tests.
  - Verify: unit/e2e default width and explicit width changes.

## 3. Acceptance

- [x] 3.1 Document startup continuity and default style.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Reload restores the last document and generator automatically.
- Restored params, operators, layers, styles, units and view are intact.
- Playback never starts automatically.
- Corrupt sessions fall back safely.
- New documents use stroke width 1.
- Existing stored widths are preserved.
