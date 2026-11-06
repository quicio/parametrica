## Context

The old projection applied `Rz(-yaw)` then `Rx(-pitch)` and viewed along +Z
with the eye at `(0, 0, -fov)`. That is a fixed-pivot turntable: the eye stays
below the XY plane and pitch only moves it toward the horizon.

## Decisions

### D1: Spherical orbit around +Z

The eye orbits the origin at radius `fov`:

```text
eye     = fov · (cos p·cos y, cos p·sin y, sin p)
forward = −eye / fov
right   = (−sin y, cos y, 0)
up      = (−sin p·cos y, −sin p·sin y, cos p)
```

Camera-space coordinates are `X = right·w`, `Y = up·w`,
`Z = forward·w + fov`, projected as `(X·fov/Z, −Y·fov/Z)`. The `+fov`
offset keeps the eye at the origin of camera space, so `Z` remains the
distance from the eye and the existing depth/clipping contract survives.

### D2: Vertical axis

The ground plane is `z = 0` and the orthographic front/side views already put
Z vertical. Making +Z vertical in 3D removes the mirror between the 3D panel
and the XZ/YZ panels and lets a Z-up model stand upright.

### D3: Poles and default pitch

`yaw` stays free in `[-π, π]`. `pitch` stays clamped to
`±(π/2 − 0.05)` so the up vector never becomes degenerate, while still
allowing top and bottom inspection.

The default pitch moves from 20° to about 34° (`0.6` rad). The old value was
chosen for a projection that looked down Z; with a real orbit it left
horizontal surfaces (tori, height fields) nearly edge-on. About 34° reads as a
three-quarter view for both horizontal surfaces and vertical forms.

### D4: Picking

`rayForArtboardPoint` now derives the eye from the orbit basis and builds the
ray through the plane point `(sx, −sy, fov)`. A round-trip test projects a
grid of world points across yaw/pitch and checks the ray passes within 1e-6.

### D5: Vase

The vase profile stays a surface of revolution. Height returns to +Z so the
model stands in the 3D view, the XZ/YZ views and the slicer.

## Test matrix

- +Z projects upward at yaw = pitch = 0.
- Yaw 180° moves the eye to the opposite side and mirrors the screen axis.
- High pitch puts the top closer than the bottom; low pitch reverses it.
- Picking rays invert the projection for yaw/pitch across the sphere.
- Near-plane clipping and scene-distance camera pullback still work.
- The vase is 200 mm tall, 175 mm wide, 135 mm at the mouth and circular
  around Z.
