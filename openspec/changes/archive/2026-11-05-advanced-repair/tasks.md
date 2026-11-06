## 1. Repair core

- [x] 1.1 Add `repairMesh` with the structured report contract.
- [x] 1.2 Remove invalid, degenerate and duplicate faces and weld vertices.
- [x] 1.3 Repair orientation consistency across manifold edges.
- [x] 1.4 Flip closed shells with negative signed volume.
- [x] 1.5 Implement fan, planar ear-clipping and auto cap strategies.
- [x] 1.6 Report fallbacks, skipped loops, contradictions and remaining errors.

## 2. Fabrication and UI

- [x] 2.1 Add sanitized `view.fabrication.repair` and `capStrategy`.
- [x] 2.2 Apply repair to derived candidates instead of 5A preparation when on.
- [x] 2.3 Keep repair off by default and preserve existing behavior.
- [x] 2.4 Add Repair and Cap strategy controls plus a repair report row.
- [x] 2.5 Disable conflicting weld/cap controls while repair is on.

## 3. Tests

- [x] 3.1 Orientation: inconsistent cube, inverted shell and contradictions.
- [x] 3.2 Caps: open box, planar loop, non-planar loop, fallback and oversized.
- [x] 3.3 Cleanup: duplicate, opposite, degenerate and welded vertices.
- [x] 3.4 Determinism and no input mutation.
- [x] 3.5 Fabrication/e2e: repair off fails, repair on exports, render unchanged.

## 4. Acceptance

- [x] 4.1 Document orientation, cap strategy and repair limitations.
- [x] 4.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Repair is explicit, deterministic and non-destructive.
- Orientation, cleanup and caps produce a validated body when repairable.
- Planar caps fall back to fan with a report.
- Failed repair never reaches STL export.
- No CSG, self-intersection repair, direct editing or new dependency.
