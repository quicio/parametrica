## Why

`Solid Vase 200` keeps its 200 mm height on Y, but the default 3D camera
projects +Y downward for the preset's initial yaw. The vase loaded upside down:
the mouth appeared at the bottom and the base at the top. The shape must read as
an upright vessel before it is used for fabrication.

## What Changes

- Keep the vase height on the positive Y axis with the mouth at the high end.
- Start the preset's 3D camera on the far side of the XY plane
  (`yaw = π - 0.35`) so +Y projects upward.
- Add tests that:
  - the mouth projects above the base;
  - every cross-section is circular around Y, so front and side match;
  - the mouth is about 135 mm.
- Document the orientation and its slicer caveat.

## Capabilities

### Modified Capabilities

- `fabricate-presets`: adds upright presentation requirements for the vase.

## Impact

- `Solid Vase 200` preset camera
- Fabricate preset domain tests
- Fabricate preset docs

## Non-goals

- No change to the camera projection model.
- No change to the geometry, wall, booleans or export contracts.
- No export-time axis conversion.
