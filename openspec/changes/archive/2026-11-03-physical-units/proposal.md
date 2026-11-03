## Why

World geometry and artboard coordinates are abstract. The plotter SVG has no
unit declaration and STL/3MF cannot be produced honestly without a physical
scale. Treating one world unit as one millimetre implicitly would be wrong.

## What Changes

- Add optional document-level physical unit metadata.
- Keep `unitless` as the default and preserve old documents exactly.
- Define separate world→mm and artboard→mm conversion factors.
- Apply physical units explicitly in plotter and fabrication export paths.
- Show physical dimensions/scale in the UI without mutating geometry.
- Validate finite positive factors and reject malformed unit metadata.

## Capabilities

### New Capabilities

- `physical-units`: explicit world/artboard unit metadata and conversion.

### Modified Capabilities

- `fabrication-contracts`: physical unit requirements for export.
- `plotter-export`: optional physical page dimensions.

## Impact

- Document schema/default/sanitization.
- UI controls for units and scale.
- Export metadata and conversion helpers.
- Tests: round-trip, backward compatibility, plotter and mesh conversion.
- No geometry, tessellation, mapping, inspection or frame change.

## Non-goals

- No automatic unit inference or calibration from an image.
- No STL/3MF writer (Phase 4C).
- No solid modeling, repair or MAKE workspace.
- No physical rendering or real-world camera calibration.
- No change to default unitless documents.
