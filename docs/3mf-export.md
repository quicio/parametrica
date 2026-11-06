# 3MF export

Fabricate can export validated bodies as a minimal deterministic 3MF package.
STL remains the default format.

## Package

```text
[Content_Types].xml
_rels/.rels
3D/3dmodel.model
```

The model is millimetre-based and contains one `<object>` plus one build
`<item>` per body. No materials, colors, textures or extensions are written.

## Body identity

- Single-body scope or a boolean result: one object.
- Multi-body scope without a boolean: one object per validated candidate body.
- Object order follows the deterministic candidate order.
- STL still merges everything into one anonymous triangle list.

## Units and scaling

- Physical world scale is required; unitless documents are rejected.
- Vertices are scaled only in the exported XML.
- Source geometry is never mutated.
- The 3MF model unit is always `millimeter` in this slice.

## Validation

Every body passes the fabrication gate before any bytes are written. Open,
non-manifold, inconsistently oriented, self-intersecting or zero-volume bodies
reject the whole package.

## Determinism

- Fixed ZIP timestamps.
- Fixed entry order and stable object IDs.
- Stable XML attribute order and number formatting.
- Repeated exports are byte-identical.

## UI

Fabricate has a **Format** selector (STL/3MF). The export button label follows
the selection and the Objects row shows how many 3MF objects will be written.
Switching format does not change bodies, repair, CSG or unit settings.

## Non-goals

- No 3MF import.
- No materials, colors or per-body appearance.
- No slicer settings, supports or print profiles.
