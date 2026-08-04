## Purpose

A generalized parametric helix generator with radial modulation, pitch
modulation, and torsion — the mathematical core of the Helix Lab. It
reduces to the classic helix when the modulation terms are zero, and
projects through the shared camera (view.camera) like parametric-3d.

## ADDED Requirements

### Requirement: Generalized helix equations

The generator SHALL evaluate the reference helix family:

```
x(t) = (r + a·cos(k·t + φ)) · cos(t + θ)
y(t) = (r + a·cos(k·t + φ)) · sin(t + θ)
z(t) = p·t + b·sin(m·t + ψ)
```

over `t ∈ [t0, t0 + 2π·turns]`, where `t0 = theta0`; the parameters SHALL be `theta0, turns, r, p, a, k, phi, theta, b, m, psi, samples, adaptive, closed, fit`.

#### Scenario: Classic helix reduction

- **WHEN** the generator has `a = 0`, `b = 0`, `theta = 0`
- **THEN** the curve equals `(r·cos t, r·sin t, p·t)` — a regular circular
  helix with radius `r` and pitch `p`

#### Scenario: Radial modulation

- **WHEN** `a > 0` and `k` is a positive integer
- **THEN** the radius oscillates between `r − a` and `r + a` with `k`
  lobes per turn, and the oscillation phase shifts by `φ`

#### Scenario: Pitch ripple

- **WHEN** `b > 0` and `m` is a positive integer
- **THEN** the z-coordinate ripples sinusoidally around the linear pitch
  `p·t` with amplitude `b` and frequency `m`, phase-shifted by `ψ`

#### Scenario: Torsion

- **WHEN** `theta ≠ 0`
- **THEN** the whole curve rotates about the z-axis by `theta` radians

### Requirement: Domain and sampling contract

The generator SHALL expose `theta0` (start), `turns` (number of 2π revolutions),
and `samples`; adaptive sampling MUST respect the samples cap.

#### Scenario: Turns extend the domain

- **WHEN** `turns = n` with `n ≥ 1`
- **THEN** the domain spans `n` full revolutions: `t1 − t0 = 2π·n`

#### Scenario: Samples cap honored

- **WHEN** adaptive sampling is enabled and `samples = S`
- **THEN** the output point count is `≤ S` and `≥ minSteps`

### Requirement: Camera-aware projection

The generator SHALL store full 3D points `{x, y, z}` plus per-point metadata
`depth`, `depthAlpha`, and `h3` (true 3D height), projected to screen
coordinates via `view.camera` (yaw/pitch/fov), consistent with `parametric-3d`.

#### Scenario: Camera drag re-projects

- **WHEN** the user drags the canvas to change `view.camera`
- **THEN** the helix re-projects with the new yaw/pitch and the geometry
  stays deterministic for the same document

#### Scenario: Depth metadata preserved

- **WHEN** the curve passes through fit/center or any geometry operator
- **THEN** `depth` and `depthAlpha` survive on every point

### Requirement: Gradient wireframe rendering

The generator's curves SHALL be renderable through a `gradient-wireframe`
render pass that maps a color ramp along a per-view axis: true 3D height
(`h3`) for `'3d' | 'xz' | 'yz'` views, and radial distance
(`hypot(x, y)`) for the `'xy'` (top-down) view, where height is
perpendicular to the screen.

#### Scenario: Height gradient in 3D and elevation views

- **WHEN** `view.projection` is `'3d'`, `'xz'`, or `'yz'`
- **THEN** the gradient ramps along `pt.h3` (bottom of the helix is one
  ramp end, top is the other)

#### Scenario: Radial gradient in top-down view

- **WHEN** `view.projection` is `'xy'`
- **THEN** the gradient ramps along `hypot(pt.x, pt.y)` so radial
  modulation (a·cos(k·t+φ)) is readable in plan view

#### Scenario: Default ramp palette

- **WHEN** no custom color ramp is set
- **THEN** the ramp defaults to the reference palette (yellow → purple →
  blue, bottom → top)
