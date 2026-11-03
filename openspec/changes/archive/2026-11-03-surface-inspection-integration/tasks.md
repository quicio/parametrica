## 1. Reference fix

- [x] 1.1 Replace projected/artboard extent cap with world horizontal span.
- [x] 1.2 Add extent tests for deep, cube and vertical shapes.

## 2. Integrated validation

- [x] 2.1 Verify reference visibility in perspective with surface overlays.
- [x] 2.2 Verify overlays coexist and PNG/SVG exclude them.
- [x] 2.3 Document UX, lifecycle, performance and limits.

## 3. Acceptance

- [x] 3.1 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Reference axes/ground are visible in perspective for ordinary surfaces.
- Reference extent never uses projected artboard units.
- Frame, bbox, geometry and exports are unchanged.
- Inspection, pin, UV Domain and seam overlays coexist in single Canvas.
- No new contracts/features.


## Verification results

- `npm run check`: lint, **1924/1924** unit checks and production build pass.
- `npm run test:e2e`: **115/115** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Added reference extent tests for cube, deep and vertical world bounds.
- Added integrated e2e coverage for UV Domain + inspector + pin + seams +
  reference coexistence and PNG/SVG exclusion.
- Manual checks: Torus with reference/seams/inspector at 1440×900 and 900×700,
  Torus/PIN/RELEASE, Quad `Single view only`.
- No frame, bbox, geometry, mapping or export change.
