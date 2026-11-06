## Why

Our BSP/remesh CSG works on the current matrix but is not a production-grade
kernel. Manifold is a mature Apache-2.0 WASM engine with guaranteed manifold
booleans, used by OpenSCAD, Blender, Babylon.js and trimesh. It fits Parametrica
better than maintaining a fragile CSG kernel ourselves.

## What Changes

- Add `manifold-3d` as an Apache-2.0 runtime dependency.
- Add a lazy WASM adapter behind the existing `booleanSolids` contract.
- Add `manifold` as a CSG strategy; `auto` prefers it when ready.
- Convert our Mesh/Solid data to Manifold Mesh and back.
- Validate every result with our existing mesh gate.
- Keep BSP and remesh as fallbacks and keep explicit strategies.
- Expose Manifold readiness and strategy in Fabricate.
- Add license/NOTICE documentation.

## Capabilities

### New Capabilities

- `manifold-engine`: lazy WASM adapter and strategy.

### Modified Capabilities

- `csg-robustness`: Manifold is the primary engine, BSP/remesh are fallbacks.
- `fabrication-contracts`: Manifold output still passes the standard gate.
- `make-workspace`: strategy selector and readiness.

## Impact

- `package.json` / `package-lock.json`
- `src/geometry/manifoldEngine.js`
- `src/geometry/csg.js`
- `src/main.js`
- Fabricate UI
- Tests, benchmark and docs

## Non-goals

- No self-intersecting input repair; Manifold requires manifold operands.
- No 3MF materials/import.
- No replacement of our validation or document format.
- No worker/threading yet.
