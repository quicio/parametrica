## 1. Split repair

- [ ] 1.1 Compute triangle intersection segments for detected pairs.
- [ ] 1.2 Split and retriangulate intersecting triangles.
- [ ] 1.3 Classify fragments with a deterministic winding test.
- [ ] 1.4 Stitch, weld, resolve T-junctions and revalidate.
- [ ] 1.5 Enforce pair/pass budgets with structured errors.

## 2. Remesh repair

- [ ] 2.1 Build a deterministic signed-distance grid.
- [ ] 2.2 Extract and weld an iso-surface.
- [ ] 2.3 Orient, cap and validate the remeshed body.
- [ ] 2.4 Enforce resolution/triangle budgets.
- [ ] 2.5 Report resolution, volume delta and triangle delta.

## 3. Integration

- [ ] 3.1 Add repair strategy and budget settings.
- [ ] 3.2 Implement auto split/remesh fallback.
- [ ] 3.3 Add Fabricate controls and report row.
- [ ] 3.4 Keep render geometry unchanged.

## 4. Tests and acceptance

- [ ] 4.1 Crossed tetrahedra/cubes and Enneper cases.
- [ ] 4.2 Determinism and budget failures.
- [ ] 4.3 E2E repair-off/repair-on and export.
- [ ] 4.4 Document approximation and no-repair limitations.
- [ ] 4.5 Run full gates and archive.

## Acceptance criteria

- Self-intersections can be resolved explicitly.
- Every result is revalidated.
- Remesh is deterministic and reports its approximation.
- Failed repair never reaches STL.
- No CSG change, direct editing or new dependency.
