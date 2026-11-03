## Why

Once units and STL export exist, users need a single honest place to check
whether a form is fabricable and export it. The MVP must not imply CAD editing,
repair or CSG.

## What Changes

- Add a read-only **Fabricate** workspace mode.
- Select the active closed Mesh/Solid as the fabrication source.
- Show validation health, triangle count, volume and physical dimensions.
- Configure units/scale using physical-units metadata.
- Export binary STL only when validation passes.
- Explain why open surfaces or invalid meshes cannot be exported.
- Keep source geometry, SurfaceMapping, render and exports unchanged.

## Capabilities

### New Capabilities

- `make-workspace`: read-only fabrication check and export flow.

### Modified Capabilities

- `panel-modes`: Fabricate mode.

## Impact

- New Fabricate panel/section and mode registration.
- Uses physical-units and fabrication-export.
- Tests: unit formatting/validation, e2e valid solid/open surface/units/export.
- No geometry editing, CSG, caps, repair, materials, slicer or multi-body.

## Non-goals

- No mesh/solid editing or vertex manipulation.
- No caps, repair, boolean/CSG, self-intersection repair.
- No multi-body packing, supports, materials, slicer integration or 3MF.
- No persistence of fabrication settings beyond document units.
- No change to existing render, mapping, inspection or artboard exports.
