## 1. Non-manifold repair

- [x] 1.1 Detect edges with more than two incident faces.
- [x] 1.2 Group incident faces into deterministic fans.
- [x] 1.3 Duplicate edge vertices and reassign fans.
- [x] 1.4 Implement explicit remove strategy and budgets.
- [x] 1.5 Report splits, removals and resulting shells.

## 2. Non-orientable repair

- [x] 2.1 Detect orientation contradiction cycles.
- [x] 2.2 Cut seams by duplicating vertices for one side.
- [x] 2.3 Reject closed non-orientable results.
- [x] 2.4 Integrate with orientation and cap repair.

## 3. Fabrication and UI

- [x] 3.1 Add topology repair settings and defaults.
- [x] 3.2 Run topology repair before orientation/caps.
- [x] 3.3 Add controls and a topology report row.
- [x] 3.4 Keep render geometry unchanged.

## 4. Tests and acceptance

- [x] 4.1 Shared-edge tetrahedra, multi-face edges and shared-face cubes.
- [x] 4.2 Möbius and closed non-orientable fixtures.
- [x] 4.3 Determinism, input immutability and budgets.
- [x] 4.4 E2E repair-off/on and export.
- [x] 4.5 Document limitations and run full gates.

## Acceptance criteria

- Non-manifold edges can be split explicitly.
- Non-orientable topology is detected and cut or rejected.
- No false-closed result reaches export.
- Clean meshes are unchanged.
- No self-intersection repair, CSG or new dependency.
