## Context

Phase 0 separated parameter, world and artboard spaces. Phase 1 added a UI-only
Spatial Reference. Surfaces already carry `domain.u/v`, `closedU/V`,
`seamU/V` and grid rows/columns; meshes carry seam/twist topology but no
per-vertex UVs.

## Decisions

### D1: Read-only domain model

`summarizeSurfaceDomain(surface)` preserves the real endpoints, min/max,
reversed-axis flags, closure, seam kind and actual grid sample counts. It
returns `null` for non-surfaces, missing ranges, non-finite values or
degenerate axes. It never substitutes `[0,1]` or `[0,2π]`.

### D2: Active-surface resolution

`activeSurfaceDomain(evaluation, document)` reads the evaluated active layer.
Hidden layers, planar layers and layers without a valid Surface return `null`.
Multiple surfaces are counted; the first valid Surface is summarized.

### D3: Inset, not viewport

`UVDomainInset` is a DOM/SVG overlay in the lower-right canvas corner. It is
read-only, does not capture pointer input and is not part of the render scene.
It shows U horizontally and V vertically, with arrows following the real
parameter direction. The plot uses a low-density 4×4 grid independent of the
surface's sampling density.

### D4: Topology cues

Closed axes use dashed seam edges. Reverse seams are labelled `↺` in the
footer. Open/closed and sample counts are explicit. The inset does not draw
surface iso-lines or imply a UV→XYZ mapping.

### D5: Activation

Visibility is UI-only, persisted under `parametrica.uvDomain.v1`, default off
and toggled from Canvas. The inset hides automatically when no valid surface is
active.

### D6: Isolation

The inset never enters `ViewTransform`, frame, bbox, geometry, Spatial
Reference, SVG, plotter, PNG or GIF. It is not exported and does not affect fit.

## Risks / Trade-offs

- The inset explains the domain but not the surface mapping; UV ↔ XYZ and
  iso-line highlighting remain future work.
- Very large or tiny numeric domains are formatted to four decimals for
  legibility; full values are available in the DOM dataset.
- The inset can overlap the lower-right artboard on narrow screens; it is
  compact and can be toggled off.
- Multiple surfaces per active layer show the first valid one with a count.

## Open Questions

- Should the inset optionally highlight low-density iso-lines on the surface?
- Should UV visibility become part of the document view instead of local UI
  state?
- When should the domain chart gain UV ↔ XYZ hover?
