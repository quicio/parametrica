## 1. Generator seam modes

- [x] 1.1 Add `seamU` / `seamV` selects (`normal` / `reverse`) to
      `parametric-surface`, defaulting to `normal`, with docs in the advanced
      group. Verify with `test/lab.smoke.mjs` group 30.
- [x] 1.2 Store the seam modes in `Surface.domain` and `Surface.meta`. Verify
      with group 30.

## 2. Twisted tessellation

- [x] 2.1 Add the wrap/corner mapping for reversed seams, sharing seam
      vertices and mirroring the opposite coordinate. Verify with group 30
      (Möbius vertex/face counts and manifold check).
- [x] 2.2 Add `twistU` / `twistV` and seam modes to mesh metadata. Verify with
      group 30.
- [x] 2.3 Extend `validateSurface` to validate seam mode values, warn on
      reversed-open axes, and warn on inconsistent reversed endpoints. Verify
      with group 30.

## 3. Compatibility curves

- [x] 3.1 Pair mirrored isolines into closed loops for twisted U/V seams in
      `meshWireframeCurves`. Verify with group 30 (`closed` curve count) and
      visual review.
- [x] 3.2 Keep normal seams and open curves unchanged. Verify with the
      existing torus/open-patch checks.

## 4. Preset, docs and release gate

- [x] 4.1 Update the Möbius Band preset to `closedU: true`,
      `seamU: 'reverse'`; update its catalog description. Verify with group 30
      and `e2e/presets.spec.js`.
- [x] 4.2 Update `SPEC.md` §14, README/architecture counts and the preset
      table. Verify with a docs grep and `npm run check`.
- [x] 4.3 Run `npm run check` and the full Playwright suite.
- [x] 4.4 Validate OpenSpec and archive after acceptance.

## Acceptance criteria

- A reversed closed seam is welded with mirrored opposite coordinates; seam
  vertices are shared and no boundary crack remains.
- The Möbius Band preset renders without a seam gap in stroke and fill modes.
- Normal closed seams and open patches are unchanged.
- Wireframe compatibility curves pair mirrored isolines into closed loops.
- Existing documents without seam modes load as `normal`.
- No document v4, no new renderer and no filled previews.

## Verification results

- `npm run check`: lint, **1565/1565** unit checks and production build pass.
- `npm run test:e2e`: **78/78** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- The Möbius mesh is 1088 shared vertices and 2048 triangles; `twistU` is
  recorded, the seam is manifold, and no duplicate boundary remains.
- The Möbius compatibility wireframe exposes 9 paired closed U loops.
- Visual review confirmed a continuous Möbius band in default stroke and
  `surface-fill` modes.
- Normal closed tori keep `twistU = false` / `twistV = false`; open patches
  still sample both endpoints and keep their open boundaries.

## Known limitations

- The Möbius mesh is manifold but non-orientable, so global orientation cannot
  be consistent by construction.
- Both-axis reversed seams use the composed corner mapping but no built-in
  preset exercises that case yet.
- A reversed seam whose sampled endpoints do not meet produces a validation
  warning; the generator does not repair the user's expression.
