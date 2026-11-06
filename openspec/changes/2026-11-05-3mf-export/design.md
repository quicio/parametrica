## Context

`zip.js` already writes deterministic ZIP archives for timeline frame export.
`exportBinarySTL` validates geometry and scales vertices to millimetres. 3MF is
an OPC ZIP package with XML model data.

## Decisions

### D1: API

```js
export3MF(bodies, {
  units,
  name = 'parametrica',
  metadata = {},
  mmPerWorldUnit = null,
})
```

`bodies` is one or more validated Mesh/Solid values. Return:

```js
{
  data: Uint8Array,
  unit: 'millimeter',
  scale,
  objects: n,
  triangles,
  vertices,
  mimeType: 'model/3mf',
}
```

### D2: Package layout

```text
[Content_Types].xml
_rels/.rels
3D/3dmodel.model
```

`3D/3dmodel.model` contains:

- `<model unit="millimeter" xml:lang="en-US">`
- `<metadata name="Title">…</Title>` when provided.
- `<resources>` with one `<object id="N" type="model">` per body.
- Each object contains `<mesh><vertices>…</vertices><triangles>…</triangles></mesh>`.
- `<build>` with one `<item objectid="N"/>` per object.

No components, materials, colors or extensions.

### D3: Units and scaling

- Require an explicit world-to-millimetre scale.
- Scale vertices only in the exported XML.
- Never mutate source geometry.
- Unitless documents are rejected before packaging.
- 3MF model `unit` is always `millimeter` for the first slice.

### D4: Validation

Every body passes `validateForFabrication` before any XML/ZIP work. Any invalid
body rejects the whole export with no partial package. Multi-body exports use
the same per-body gate as STL multi-body.

### D5: Determinism

- ZIP entry order fixed.
- ZIP timestamps fixed (e.g., 1980-01-01).
- XML attributes and object IDs follow input order.
- No random IDs or local timestamps.
- Repeated exports are byte-identical.

### D6: UI

Fabricate gets a **Format** selector: STL (default) or 3MF. The export button
uses the selected format. The report shows object count, triangles, unit and
format. Switching format never changes the selected bodies or repair/CSG
settings.

## Test matrix

- Package entries and content types exactly as specified.
- XML is well-formed; object/build counts match bodies.
- Single-body and multi-body objects.
- Units and vertex scaling; source geometry unchanged.
- Invalid/open/self-intersecting body rejects with no bytes.
- Deterministic bytes across runs.
- E2E: format selector, download extension, report counts.
