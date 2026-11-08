## Context

Verified baseline:

- `src/export/3mf.js` writes `<triangle v1="${face[0]}" v2="${face[1]}"
  v3="${face[2]}"/>` for every face.
- `triangle` count currently increments by `mesh.faces.length`, so a quad is
  counted as one triangle even though only one triangle is written.
- Many app meshes use quads (tube rings, cubes, swept surfaces), so the issue is
  user-visible, not theoretical.
- `src/geometry/manifoldEngine.js` marks Manifold output with
  `meta.manifoldGuaranteed = true`.
- `src/geometry/validate.js` skips self-intersection checks when that flag is
  true.
- `repairMesh` and the lattice builder already re-validate after post-process,
  but the contract is not enforced centrally.

## Triangulation contract

```text
for each face:
  if face.length === 3: emit as-is
  if face.length > 3:
    verify the face is simple and planar within tolerance
    triangulate deterministically in the face plane
    emit triangles with the original winding
  otherwise: reject
```

Rules:

- The diagonal order is deterministic (for example lexicographic by vertex
  index) so repeated exports are byte-identical.
- A face that cannot be triangulated produces a structured
  `FabricationExportError` naming the body and face index.
- `triangles` in the export result counts emitted triangles.
- Source geometry is never mutated.

## Trust-flag contract

- `manifoldGuaranteed` is evidence about a specific mesh, not a property of a
  pipeline stage.
- Any operation that adds, removes, splits, welds, flips or relocates
  vertices/faces clears the flag.
- The validator must treat a missing flag as "unknown" and run the normal
  checks.
- A clear flag must never be re-set by a non-Manifold process.
- The final report records whether the guarantee survived.

## Decisions

D1. **Triangulate or reject:** triangulate planar simple faces; reject anything
else. Do not silently emit a partial triangle.

D2. **Helper contract:** `build3MFModelXML` may either triangulate internally
or require pre-triangulated meshes and reject otherwise. Recommendation:
triangulate internally and expose the emitted count so tests can assert it.

D3. **Trust boundary:** the clearest implementation is explicit
`trusted: false` on post-process entry points, plus a final validator that
never upgrades trust. The flag is cleared at the boundary, not remembered by
each caller.

D4. **Backward compatibility:** existing triangular meshes export identically;
quad meshes gain the missing triangles. Byte output changes only where it was
previously wrong.

## Acceptance classification

**Functional guarantees**

- 3MF contains only valid triangles.
- Triangle count equals emitted triangle count.
- Quad export produces two triangles, not one.
- Post-processed geometry without trust runs self-intersection checks.
- Deterministic output for the same input.

**Quality objectives (provisional)**

- No measurable slowdown for the existing presets.
- Error messages identify body and face.

**Pending benchmarks / decisions**

- Confirm no external consumer depends on the old partial-face output.
- Decide whether the 3MF writer exposes a `triangulated` statistic.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Triangulation changes volume or winding | Medium | Recompute validation; preserve order |
| Non-planar faces become invalid triangles | Medium | Reject with explicit error |
| Trust flag cleared too aggressively | Low | Revalidate; report unknown instead of failing |
| Existing 3MF snapshots change | Low | Expected only for erroneous quad output |
