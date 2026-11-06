## 1. Adapter

- [x] 1.1 Add `manifold-3d` dependency and license notice.
- [x] 1.2 Add lazy `initManifold`/`isManifoldReady`.
- [x] 1.3 Convert Mesh/Solid to Manifold Mesh and back.
- [x] 1.4 Implement union/difference/intersection with cleanup.
- [x] 1.5 Validate output and return structured failures.

## 2. Integration

- [x] 2.1 Add `manifold` strategy to `booleanSolids`.
- [x] 2.2 Auto prefers Manifold when ready; fallback otherwise.
- [x] 2.3 Preload Manifold in `main.js` and expose readiness.
- [x] 2.4 Add Fabricate strategy option and report.

## 3. Tests and docs

- [x] 3.1 Cube matrix and determinism.
- [x] 3.2 Full-res overlapping tori.
- [x] 3.3 Invalid operands and not-ready behavior.
- [x] 3.4 E2E Manifold strategy and fallback.
- [x] 3.5 Benchmark, bundle/load documentation and full gates.

## Acceptance criteria

- Manifold performs robust union/difference/intersection.
- Output passes our validation.
- Auto uses Manifold when ready and falls back safely.
- BSP/remesh behavior is unchanged when Manifold is unavailable.
- Apache-2.0 notice is included.
