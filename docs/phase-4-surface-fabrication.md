# Phase 4 — Surface workbench, units and fabrication

This page records the semantics and limits of the four Phase 4 slices:
surface operators, physical units, STL export and the Fabricate mode.

## 4A — Surface workbench

- World operators that declare `surface`/`mesh` acceptance run **before**
  tessellation. Camera and projection changes never invalidate them.
- Supported spatial operators: `translate`, `rotate` (about world Z),
  `scale` (X/Y/Z), `mirror` (X/Y) and the repeat/array family.
- Operators map canonical world points. Curves keep their existing 2D
  semantics and operator order.
- A topology-preserving transform leaves the Surface grid/domain untouched;
  tessellation regenerates a mapping with the same domain, cells and corner
  UVs. Repeat/array creates one Surface and one mapping per copy.
- Unsupported operator kinds produce a keyed operator error and are not
  cached. There is no CSG, cap, repair or mesh authoring.

## 4B — Physical units

`view.units` is optional metadata:

```js
{
  world: 'unitless' | 'mm' | 'cm',
  mmPerWorldUnit: number | null,
  artboard: 'unitless' | 'mm' | 'cm',
  mmPerArtboardUnit: number | null,
}
```

- Missing metadata means `unitless`; legacy documents are unchanged.
- Factors must be finite and positive. Incomplete physical metadata is
  reported in the Scale panel and blocks physical consumers.
- Units never rescale world vertices, tessellation, SurfaceMapping, frames or
  bounding boxes. Conversion happens only at display/export boundaries.
- World and artboard scales are independent. One world unit is never assumed
  to equal one millimetre.
- The plotter keeps its abstract `viewBox`. When artboard units are physical,
  the SVG `width`/`height` are emitted in millimetres and marked with
  `data-units="mm"`.

## 4C — Binary STL

- `exportBinarySTL(geometry, { units, mmPerWorldUnit })` writes one binary STL
  body from a validated closed Mesh/Solid.
- Validation runs before any bytes are produced. Open, non-manifold,
  inconsistently oriented, degenerate and invalid-index meshes are rejected.
- Facet order follows mesh face order; normals follow winding; repeated export
  with the same geometry and scale is byte-identical.
- Scaling is applied only to exported vertices. World geometry is not mutated.
- STL has no unit field. The exporter returns `unit: 'mm'`, `scale`, triangle
  count, geometry id and volume metadata alongside the bytes.
- Self-intersection validation is not implemented and is reported as a
  warning. There is no repair, CSG, multi-body packing or 3MF yet.
- Phase 5A adds opt-in weld/cap preparation for the derived fabrication source;
  see `docs/solid-preparation.md`. Render geometry is not edited.
- Phase 5B adds real self-intersection diagnostics; see
  `docs/self-intersection.md`. Intersecting meshes are rejected, not repaired.

## 4D — Fabricate mode

- `Fabricate` is a seventh, read-only workspace mode.
- The source is the active layer's first validated closed Mesh/Solid. Open
  surfaces and invalid meshes are counted but never exportable.
- The panel shows health, source kind/id, triangle/vertex counts, volume,
  world bbox, physical bbox and validation warnings.
- Export is disabled when the document is unitless or lacks a finite positive
  world scale, with a reason shown in the panel.
- Export uses the 4C STL writer and never mutates geometry.
- There is no editing, repair, cap, CSG, material, support, slicer or multi-body
  workflow in this mode.
