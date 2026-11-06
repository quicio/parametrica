## Why

Dragging the 3D canvas changed yaw and pitch, but the eye never left the lower
hemisphere: the projection rotated the world around Z and tilted it, keeping
the camera below the ground plane. Users could spin a figure in place and tilt
it slightly, but could not orbit to its top, bottom or opposite side. The
perspective felt "stuck in a range".

## What Changes

- Project world points from a camera that orbits the origin at radius `fov`:
  - `yaw` moves the eye around the vertical **Z** axis;
  - `pitch` raises or lowers the eye above the XY plane;
  - **+Z** is always vertical on screen.
- Keep the existing `project3D` contract: screen coordinates plus normalized
  depth, with near-plane clipping.
- Update the picking ray to invert the new orbit projection exactly.
- Add orbit, pole-clamp and pick round-trip tests.
- Return the hollow vase to its natural **Z-up** orientation, which also makes
  the exported STL/3MF stand on the slicer bed.

## Capabilities

### New Capabilities

- `orbit-camera`: a full-sphere orbit camera for 3D scenes.

### Modified Capabilities

- `fabricate-presets`: the vase stands on Z and its starting view is upright.

## Impact

- `src/view/camera.js`, `src/interaction/ray.js`
- Camera math docs in generators/transform
- Vase preset geometry and tests
- Fabricate preset docs

## Non-goals

- No change to orthographic `xy`/`xz`/`yz` projections.
- No change to world geometry, fit, export or document schema.
- No new camera UI controls.
