## 1. Feature projection

- [x] 1.1 Detect feature edges by dihedral angle.
- [x] 1.2 Add closest-point-on-mesh and closest-point-on-segment queries.
- [x] 1.3 Project vertices and snap near feature edges.
- [x] 1.4 Preserve topology and determinism.
- [x] 1.5 Report projected/feature stats.

## 2. Integration and tests

- [x] 2.1 Enable projection by default in remesh.
- [x] 2.2 Keep raw behavior when disabled.
- [x] 2.3 Cube/torus volume and determinism tests.
- [x] 2.4 CSG/self-intersection fallback tests.
- [x] 2.5 Document limits and run full gates.

## Acceptance criteria

- Remesh volume/feature fidelity improves.
- Results remain valid, deterministic and watertight.
- Projection can be disabled.
- No UI/document change or new dependency.
