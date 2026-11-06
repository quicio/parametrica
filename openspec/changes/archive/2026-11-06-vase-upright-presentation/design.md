## Context

`project3D` maps a world point to screen space with

```text
screenY = (y·cos(yaw)·cos(pitch) + z·sin(pitch)) · f / depth
```

For the default `yaw = -0.6`, `cos(yaw) > 0`, so +Y projects downward. The vase
height is on +Y, so the mouth (high Y) appeared below the base.

## Decisions

### D1: Keep the height on +Y

+Y is the upright axis of the XY front view and keeps the fabrication bounding
height at 200 mm. Flipping the geometry to -Y would have fixed the 3D view but
made the front view upside down.

### D2: Start the camera on the far side

`yaw = π - 0.35` gives `cos(yaw) < 0`, so +Y projects upward, and 0.35 keeps a
readable three-quarter view instead of a fully flat silhouette. Pitch stays at
0.34 to match the other Fabricate examples.

### D3: Symmetry is the contract

The profile uses one radius per `v`, sampled over all `u`. Every cross-section is
a circle around Y, so front and side silhouettes are identical by construction.
The test checks the generated radii directly instead of relying on a screenshot.

### D4: Export orientation

The exporter keeps document axes. Because the height is on Y, slicers that
assume Z-up show the vase on its side until the user rotates it 90° about X.
Changing the exported axes would alter the export contract, so it stays out of
this change.

## Test matrix

- Mouth projects above the base with the preset camera.
- Radial spread per Y row is below 1e-6.
- Mouth diameter is 135 ± 3 mm.
- Existing exportability, volume and triangle checks stay green.
