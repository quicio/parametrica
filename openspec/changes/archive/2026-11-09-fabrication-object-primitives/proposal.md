## Why

Fabricate has a solid vase/lattice family, but functional objects need shapes
that are not a simple tapered surface of revolution: rounded rectangular trays,
blind holes, slots, keyholes and stepped candle recesses.

Without shared primitives each preset would duplicate expression strings and
cutter setup, and construction layers would leak into the technical renderer.

## What Changes

- Add a rounded-shell builder based on a superellipse cross-section.
- Add cutter layers marked as fabrication-only construction geometry.
- Require cutter layers to participate in a single difference operation while
  being excluded from the technical canvas and SVG export.
- Define open annular shells and stepped solids of revolution.
- Add domain coverage for cutter visibility and multi-cutter differences.

## Out of Scope

- Sequential CSG recipes beyond one union/difference.
- A new mesh generator.
- UI controls for construction layers.
