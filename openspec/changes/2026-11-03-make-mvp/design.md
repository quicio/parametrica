## Context

Surface inspection already identifies surfaces and meshes. Physical units and
STL export provide the two missing pieces. MAKE MVP is a read-only consumer of
validated geometry, not a modeling environment.

## Decisions

### D1: Fabricate mode

Add a seventh workspace mode, `Fabricate`, with a single read-only panel. It
does not host parameter/operator editors and does not modify the document
geometry.

### D2: Source selection

The source is the active layer's first valid closed Mesh/Solid. A single body
is supported. Open surfaces and non-manifold meshes are listed but cannot be
exported. A later phase can add multi-body selection.

### D3: Health readout

Show:

- source kind/id;
- validation status and errors/warnings;
- triangle/vertex counts;
- volume when valid;
- world bbox and physical bbox in selected units;
- self-intersection limitation.

### D4: Units and export

Use `view.units` from Phase 4B. If unitless, require explicit physical scale
before enabling export. Export uses Phase 4C STL and only writes after
validation passes.

### D5: No CAD

No editing, repair, CSG, caps, materials, supports or slicer integration. The
mode is a gate and an exporter, not a modeling workspace.

### D6: Product state

Fabrication selection is derived/UI-only. Geometry remains owned by the
document and is never mutated by the mode.

## Risks / Trade-offs

- Only one body and one closed surface/solid at a time.
- Self-intersection may be unchecked; warning must be visible.
- Users may expect repair; the MVP must explain it is not available.
- Unitless documents cannot export until a scale is set.
- STL has no embedded unit.

## Open Questions

- Should Fabricate be a mode or a Keep section? This spec chooses a mode.
- Should the first body be active layer or explicit selection?
- Should multi-body be the next MAKE slice?
