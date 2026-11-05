## 1. Geometry

- [x] 1.1 Add deterministic vertex weld with tolerance and degenerate-face removal.
- [x] 1.2 Add boundary-loop extraction with incomplete/oversized reporting.
- [x] 1.3 Add orientation-preserving caps and mesh merge.
- [x] 1.4 Add `prepareMesh` composition and validation.

## 2. Document and fabrication

- [x] 2.1 Add sanitized `view.fabrication` settings, off by default.
- [x] 2.2 Apply preparation only to the derived fabrication source.
- [x] 2.3 Keep STL export and reports on the validated prepared mesh.

## 3. UI and tests

- [x] 3.1 Add weld/cap controls and preparation report in Fabricate.
- [x] 3.2 Verify render geometry and exports are unchanged when disabled.
  - Verify: unit weld/cap/merge/preparation; e2e open surface → prepared → STL.

## 4. Acceptance

- [x] 4.1 Document cap/merge limits and the no-CSG boundary.
- [x] 4.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Weld, caps and merge are deterministic and non-destructive.
- Preparation is off by default and never bypasses validation.
- Open parametric surfaces can be prepared and exported as STL.
- Render geometry, SVG/PNG and document layers are unchanged.
- No CSG, self-intersection detection, multi-body export or new dependency.
