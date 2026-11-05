## 1. Model and selection

- [x] 1.1 Add sanitized `view.fabrication.scope`, default `single`.
- [x] 1.2 Collect body candidates by active layer or visible composition.
- [x] 1.3 Validate bodies independently and report exclusions.

## 2. Merge and export

- [x] 2.1 Merge selected bodies with index offsets.
- [x] 2.2 Revalidate the merged mesh and reject overlaps.
- [x] 2.3 Export one STL containing all valid shells.

## 3. UI and tests

- [x] 3.1 Add scope selector, Bodies row and merged report.
- [x] 3.2 Verify default single-body behavior and multi-body counts.
  - Verify: unit scope/merge/overlap; e2e composition export.

## 4. Acceptance

- [x] 4.1 Document disjoint-shell and no-union limits.
- [x] 4.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Single-body remains the default and is unchanged.
- Multi-body scope is explicit and validated.
- Overlapping shells are rejected, not unioned.
- Render geometry and SVG/PNG are unchanged.
- No CSG, 3MF or new dependency.
