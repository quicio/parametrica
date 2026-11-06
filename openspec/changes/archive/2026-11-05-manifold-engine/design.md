## Context

`booleanSolids` currently selects BSP or remesh synchronously. Manifold is a
WASM module that must be initialized asynchronously. Both browser and Node are
supported.

## Decisions

### D1: Dependency

Use `manifold-3d` 3.5.x, Apache-2.0. Pin the version and include its license
notice. Lazy-load it like p5 so the first paint is unaffected.

### D2: Adapter

`src/geometry/manifoldEngine.js`:

```js
initManifold() -> Promise<Wasm>
isManifoldReady() -> boolean
manifoldBoolean(operation, operands, options) -> BooleanResult
```

`manifoldBoolean` is synchronous once initialized. Before initialization it
returns `{ ok:false, error:{ code:'not-ready' } }`.

### D3: Data conversion

Manifold `Mesh`:

- `numProp = 3`
- `vertProperties` interleaved x/y/z
- `triVerts` triangle indices

Our Mesh/Solid is triangulated on input. Output is read from `getMesh()` and
rebuilt as a canonical Mesh. Inputs are not mutated. All Manifold objects are
`.delete()`d in `finally`.

### D4: Strategy

Add `manifold` to `view.fabrication.csgStrategy`.

- `manifold`: explicit; fails with `not-ready` before initialization.
- `auto` (default): Manifold first when ready; BSP then remesh fallback.
- `bsp` / `remesh`: unchanged.

The result stats record `strategy`, `fallback`, `engine` and input/output
triangles.

### D5: Validation

Manifold output is not trusted blindly. It is converted back and passed through
`validateMesh`, including closed, manifold, orientation, self-intersection and
volume. Invalid output is a structured failure. Manifold status other than
`NoError` is a failure.

### D6: Initialization

`main.js` starts `initManifold()` in the background and exposes
`window.__parametricaManifoldReady` for tests. Fabricate can show readiness.
Tests await initialization before using the explicit strategy.

## Test matrix

- Cube union/difference/intersection volumes and determinism.
- Full-resolution overlapping tori union/difference/intersection.
- Disjoint intersection empty.
- Non-manifold/self-intersecting input rejection.
- Auto uses Manifold when ready and falls back when unavailable.
- STL/3MF output unchanged.
- Bundle/initialization measure.
