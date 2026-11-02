## 1. SVG builder extraction

- [x] 1.1 Extract `Exporter.buildSVGFromCurrent()` from `exportSVG()` without
      changing single-file SVG behavior.
  - Verify: existing SVG unit/e2e tests remain green.

## 2. Timeline export

- [x] 2.1 Add Export SVG frames to Timeline with duration/FPS sampling.
- [x] 2.2 Package `frame-NNN.svg` and `manifest.json` with format, times and
      per-frame omissions.
- [x] 2.3 Restore time/playback in `finally` and report status.
  - Verify: e2e downloads the ZIP, checks frame names, `<svg`, embedded
    document, manifest format and playhead restoration.

## 3. Documentation and acceptance

- [x] 3.1 Update README, SPEC §17, architecture, audit and roadmap.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Timeline exports a deterministic SVG frame ZIP and manifest.
- Frames use the same duration/FPS sampling as PNG and GIF.
- SVG frames include active passes, overlays, blend and fill gradients.
- The playhead and playing state are restored.
- Keep remains free of duplicated temporal export.
- No plotter, MAKE, animated SVG or new rendering feature.


## Verification results

- `npm run check`: lint, **1657/1657** unit checks and production build pass.
- `npm run test:e2e`: **100/100** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- E2E verifies ZIP frame names, embedded SVG document, `format: "svg"` in
  the manifest and playhead restoration.
- The new action lives in Timeline (Perform); Keep is unchanged.
