## 1. Primitives

- [x] 1.1 Add the superellipse rounded-shell builder.
- [x] 1.2 Add cutter layers with `fabricationRole`.
- [x] 1.3 Filter cutters from the render scene.
- [x] 1.4 Add cylinder and box cutters.
- [x] 1.5 Add open annular shells and stepped solids.

## 2. Verification

- [x] 2.1 Assert cutter layers are excluded from the render scene.
- [x] 2.2 Assert one difference removes multiple cutters.
- [x] 2.3 Assert rounded shells and open shells are exportable.
- [x] 2.4 Run full gates.

## Acceptance criteria

- Construction layers never appear as authored geometry.
- Cutters remain available to Fabricate.
- Rounded shells and annular shells are closed and exportable.
- No change to existing Solid Vase or lattice geometry.
