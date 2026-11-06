## 1. SDF

- [x] 1.1 Build a BVH-backed SDF with closest distance.
- [x] 1.2 Use multi-ray winding instead of parity.
- [x] 1.3 Add Manifold.levelSet adapter with simplify.
- [x] 1.4 Tag Manifold output and record the trust boundary.
- [x] 1.5 Validate output and handle failures.

## 2. Integration

- [x] 2.1 Add `sdf` strategy and auto preference.
- [x] 2.2 Keep remesh fallback and explicit strategies.
- [x] 2.3 Add UI options and resolution control.
- [x] 2.4 Keep render geometry unchanged.

## 3. Tests and acceptance

- [x] 3.1 Enneper and overlapping-cube cases.
- [x] 3.2 Winding sign for overlap.
- [x] 3.3 Determinism and fabrication export.
- [x] 3.4 E2E SDF repair.
- [x] 3.5 Document limits and run full gates.

## Acceptance criteria

- SDF repair produces valid manifold bodies for tested self-intersections.
- Auto prefers SDF; remesh remains available.
- Manifold's guarantee is recorded, not hidden.
- No render/document mutation and no new dependency.
