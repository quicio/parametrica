## Why

The 3MF writer emits `v1`, `v2` and `v3` from each mesh face. App meshes are not
guaranteed to be triangles; a quad loses the triangle formed by its third and
fourth vertices. The 3MF spec declares a triangle list, so the output is
incomplete rather than merely simplified.

Separately, `manifoldGuaranteed` is used to skip self-intersection checks. That
trust is valid only while the Manifold result is unmodified. A repair, cap,
orientation pass or simplification can invalidate it.

Both issues undermine downstream manufacturing claims.

## What Changes

- 3MF SHALL triangulate every face with more than three vertices, or reject the
  export with a structured error when triangulation is not possible.
- Triangulation SHALL be deterministic and preserve face orientation.
- 3MF triangle count SHALL count emitted triangles, not source faces.
- `manifoldGuaranteed` SHALL be cleared by any post-process that changes
  topology or vertex/face identity.
- Validation after post-processing SHALL NOT inherit the flag from the
  pre-process mesh.
- Add regression tests for quad meshes, triangulation determinism and trust-flag
  lifecycle.

## Out of Scope

- No changes to CSG algorithms, repair strategies or the worker.
- No new export format.
- No relaxation of the existing geometry validity gate.
- No UI work beyond reporting an export error if triangulation fails.

## Dependencies

- `3mf-export`, `manifold-engine`, `validation-contracts`,
  `advanced-repair`.

## Impact

- `src/export/3mf.js`: triangulation and triangle accounting.
- `src/geometry/*` post-process boundaries that currently propagate trust.
- Tests for 3MF and trust-flag lifecycle.
- Documentation and roadmap status.

## Open Questions

1. Should non-planar quads be triangulated by a diagonal chosen deterministically
   or rejected? Recommendation: triangulate only if the face is planar within
   tolerance; otherwise reject with a named error.
2. Do any current callers rely on `build3MFModelXML` writing source faces
   verbatim? Tests should answer this before changing the helper.
3. Which post-processes need an explicit `trusted: false` parameter instead of
   callers remembering to clear the flag?
