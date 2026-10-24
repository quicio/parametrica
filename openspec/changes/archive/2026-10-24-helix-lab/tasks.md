## 1. Helix generator (core, Node-runnable)

- [x] 1.1 Create `src/generators/helix.js`: schema with `theta0, turns, r, p, a, k, phi, theta, b, m, psi, samples, adaptive, closed, fit`; domain `t ∈ [theta0, theta0 + 2π·turns]`; equations per spec. Emit `{x, y, z, depth, depthAlpha, h3}` per point, project via `ctx.document.view.camera`.
  - Verify: unit group — classic reduction `a=0,b=0,theta=0` equals `(r·cos t, r·sin t, p·t)`; radial modulation lobes; pitch ripple; torsion.
- [x] 1.2 Register in `src/generators/index.js`; add `helix` to the expected-id array in `test/lab.smoke.mjs` group 4.
  - Verify: registration assert + `evalOK(doc, 'helix')`.
- [x] 1.3 Unit tests: domain `t1−t0 = 2π·turns`; adaptive ≤ samples cap; depth/h3 survive fit/center + mirror (extend existing metadata test).
  - Verify: `npm test` group 4 + sampling group 11 pass.
- [x] 1.4 Multi-curve support for Doble Hélice: generator returns two curves when `strands=2` (new param, default 1), second with `phi + π`.
  - Verify: unit — `strands=2` yields 2 curves, phase-offset by π.

## 2. Orthographic projections (render-time)

- [x] 2.1 Add `view.projection` to `DEFAULT_VIEW` + sanitizer (default `'3d'`); accept `'xy'|'xz'|'yz'`.
  - Verify: sanitize test — missing → `'3d'`; invalid → `'3d'`.
- [x] 2.2 Implement projection in the stroke/render path: map points by dropping the perpendicular axis (`xy` drop z, `xz` drop y, `yz` drop x); apply `fit` to the projected bbox.
  - Verify: e2e/pixels — switching `view.projection` visibly changes the canvas; fit rescales the projection.
- [x] 2.3 Gate camera drag + scroll zoom on `view.projection === '3d'`.
  - Verify: e2e — drag in `'xz'` does not change yaw/pitch.
- [x] 2.4 Add the projection selector to the VIEW section (lil-gui select bound to `document.view.projection`, direct binding).
  - Verify: e2e — select change updates doc and canvas without re-evaluation.

## 3. Gradient wireframe render pass

- [x] 3.1 Create `src/render/passes/gradient.js`: per-segment stroke with color ramp by `pt.h3` (default yellow→purple→blue); composable with projections.
  - Verify: unit-less (render) — e2e screenshot/pixels differ from plain stroke.
- [x] 3.2 Register pass; add to available viz modes.
  - Verify: e2e — switching viz mode to gradient renders without error.
- [x] 3.3 Batch segments by ramp bucket (≤ 64) if > 8000 points.
  - Verify: performance group 12 keeps the 8k helix under the geometry gate;
    e2e asserts colored pixels under the gradient pass.

## 4. Presets — six variations

- [x] 4.1 Add the six helix presets to `src/presets/builtins.js` (Básica, Radio Variable, Paso Variable, Ondulada, Doble Hélice, Cónica) with parameters per spec.
  - Verify: unit — all six evaluate with zero errors; pairwise point sets differ.
    Cónica is a true pointed cone (`a = r`, `phi = 0`).
- [x] 4.2 Determinism test: evaluate twice, identical geometry.
  - Verify: unit — same doc + seed ⇒ same points.
- [x] 4.3 Export round-trip: JSON export → import → same geometry.
  - Verify: unit group 9 (svg/json) extended.

## 5. e2e QA suite

- [x] 5.1 `e2e/helix.spec.js`: load each variation, assert zero errors; drag a helix slider (r, turns, a) and assert doc + pixels change; switch projection and assert canvas changes; camera drag works in 3D and is inert in projections.
  - Verify: `npm run test:e2e` green.

## 6. Docs

- [x] 6.1 Update `SPEC.md`: §6 generator table (`helix`), §11 view schema (`projection`, `colorRamp`), milestone status table, dependency note (none new).
  - Verify: SPEC.md consistent with code; `npm test` still green.
- [x] 6.2 Update `CONTRIBUTING.md` registry skeletons if they enumerate generators.
  - Verify: grep for generator lists matches `Generators.list()`.

## Verification results

- `npm test`: **1139/1139 checks** (group 25 added).
- `npm run build`: succeeds; the existing >500 kB chunk warning is unchanged.
- `npm run test:e2e`: **55/55 tests**, including the new `e2e/helix.spec.js`
  (presets, projection/no re-evaluation, camera gating, slider pixels and
  gradient colors).
- `openspec validate --changes`: valid.
