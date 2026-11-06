# Manifold engine

Parametrica uses [`manifold-3d`](https://github.com/elalish/manifold) 3.5.x as
the primary robust CSG engine. Manifold is Apache-2.0, runs as WASM in browser
and Node, and guarantees manifold output for valid manifold input.

## Why

- Guaranteed manifold booleans.
- Mature and battle-tested (OpenSCAD, Blender, Babylon.js, trimesh).
- Apache-2.0 and small enough to lazy-load.
- Exact enough for fabrication; no remesh approximation for valid operands.
- Supports union, difference and intersection over multiple operands.

## Integration

`src/geometry/manifoldEngine.js`:

```js
await initManifold()
isManifoldReady()
manifoldBoolean(operation, operands, { tolerance })
```

- Lazy WASM initialization via `manifold-3d`.
- Browser Vite asset resolution via `manifold-3d/manifold.wasm?url`.
- Our Mesh/Solid is converted to Manifold `Mesh` (`numProp = 3`).
- Output is converted back, cleaned with our repair pipeline (`orient: false`
  to preserve cavities), and validated by `validateMesh`.
- Manifold objects are `.delete()`d in `finally`.

## Level set

`manifoldLevelSet(sdf, { bounds, edgeLength, tolerance })` wraps
`Manifold.levelSet` and is used by self-intersection repair. The SDF uses
positive-inside winding sign; output is simplified, converted and validated.
Manifold output is tagged `manifoldGuaranteed`, so the local approximate
self-intersection detector records `checked:false` while all other mesh gates
remain active.

## Strategy

`view.fabrication.csgStrategy`:

```text
auto | manifold | bsp | remesh
```

- `auto` (default): Manifold when ready; BSP then remesh fallback.
- `manifold`: explicit; returns `not-ready` before initialization.
- `bsp` / `remesh`: unchanged fallbacks.

The Boolean result row reports the actual engine and fallback.

## Validation

Manifold output is not trusted blindly:

- Manifold status must be `NoError`.
- Output is converted and passed through `validateMesh` (closed, manifold,
  orientation, self-intersection, volume).
- Invalid output is a structured failure and never reaches STL/3MF.

## Measured reference

`npm run bench:manifold` on development hardware:

```text
init: ~15 ms
cubes union/difference/intersection: ~2–14 ms
full-res overlapping tori:
  union        ~289 ms, 6144 triangles, volume 63.079
  difference   ~203 ms, 4864 triangles, volume 23.917
  intersection ~163 ms, 3584 triangles, volume 15.245
```

These tori now use Manifold directly instead of remesh fallback.

## Limitations

- Manifold requires manifold input; self-intersecting meshes still need our
  remesh/repair path first.
- WASM adds ~2.8 MB of package data and lazy initialization.
- WASM build is serial-only.
- Version is pinned; upgrade only with the full CSG regression matrix.
- No worker offloading yet.
