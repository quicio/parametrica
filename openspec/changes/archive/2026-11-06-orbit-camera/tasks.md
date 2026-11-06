## 1. Camera

- [x] 1.1 Replace the fixed-pivot projection with a spherical orbit around +Z.
- [x] 1.2 Keep screen coordinates, depth and near-plane clipping unchanged.
- [x] 1.3 Update the picking ray inverse.
- [x] 1.4 Document the orbit basis in the camera and generator docs.
- [x] 1.5 Add orbit, pole and pick round-trip tests.

## 2. Vase

- [x] 2.1 Return the vase height to +Z.
- [x] 2.2 Use the standard starting camera.
- [x] 2.3 Update dimensions, symmetry and mouth tests.
- [x] 2.4 Document the Z-up export orientation.

## 3. Acceptance

- [x] 3.1 Node, domain and build gates pass.
- [x] 3.2 Playwright suite passes.
- [x] 3.3 Archive the change.

## Acceptance criteria

- Yaw orbits the eye around the object.
- Pitch can rise above and fall below the object.
- +Z stays vertical on screen.
- Picking matches the projection.
- The vase stands upright and exports Z-up.
