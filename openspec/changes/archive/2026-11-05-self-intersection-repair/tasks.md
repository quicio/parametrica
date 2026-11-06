## 1. Remesh repair

- [x] 1.1 Build a deterministic signed-distance grid.
- [x] 1.2 Extract and weld an iso-surface.
- [x] 1.3 Orient, cap and validate the remeshed body.
- [x] 1.4 Enforce resolution/triangle budgets.
- [x] 1.5 Report resolution, volume delta and triangle delta.

## 2. Integration

- [x] 2.1 Add repair strategy and budget settings.
- [x] 2.2 Implement auto remesh behavior.
- [x] 2.3 Add Fabricate controls and report row.
- [x] 2.4 Keep render geometry unchanged.

## 3. Tests and acceptance

- [x] 3.1 Crossed cubes and Enneper cases.
- [x] 3.2 Determinism and budget failures.
- [x] 3.3 E2E repair-off/repair-on and export.
- [x] 3.4 Document approximation and no-split limitations.
- [x] 3.5 Run full gates and archive.

## Acceptance criteria

- Self-intersections can be resolved explicitly.
- Every result is revalidated.
- Remesh is deterministic and reports its approximation.
- Failed repair never reaches STL.
- No CSG change, direct editing or new dependency.
