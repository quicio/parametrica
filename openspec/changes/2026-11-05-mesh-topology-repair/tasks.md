## 1. Non-manifold repair

- [ ] 1.1 Detect edges with more than two incident faces.
- [ ] 1.2 Group incident faces into deterministic fans.
- [ ] 1.3 Duplicate edge vertices and reassign fans.
- [ ] 1.4 Implement explicit remove strategy and budgets.
- [ ] 1.5 Report splits, removals and resulting shells.

## 2. Non-orientable repair

- [ ] 2.1 Detect orientation contradiction cycles.
- [ ] 2.2 Cut seams by duplicating vertices for one side.
- [ ] 2.3 Reject closed non-orientable results.
- [ ] 2.4 Integrate with orientation and cap repair.

## 3. Fabrication and UI

- [ ] 3.1 Add topology repair settings and defaults.
- [ ] 3.2 Run topology repair before orientation/caps.
- [ ] 3.3 Add controls and a topology report row.
- [ ] 3.4 Keep render geometry unchanged.

## 4. Tests and acceptance

- [ ] 4.1 Shared-edge tetrahedra, multi-face edges and shared-face cubes.
- [ ] 4.2 Möbius and closed non-orientable fixtures.
- [ ] 4.3 Determinism, input immutability and budgets.
- [ ] 4.4 E2E repair-off/on and export.
- [ ] 4.5 Document limitations and run full gates.

## Acceptance criteria

- Non-manifold edges can be split explicitly.
- Non-orientable topology is detected and cut or rejected.
- No false-closed result reaches export.
- Clean meshes are unchanged.
- No self-intersection repair, CSG or new dependency.
