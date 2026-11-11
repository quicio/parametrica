## Why

The remaining 2D generator families complete the classic/lab curve surface
before moving to 3D, surface and lattice generators.

## What Changes

- Convert `polar`, `custom`, `fourier`, `noiseField`, `concentricEllipses` and
  `bilateralSpline` to `.ts`.
- Add per-generator param interfaces and typed sample/domain functions.
- Keep JS compatibility re-exports and update the generator index.

## Out of Scope

- Trochoids, splines, attractors, 3D, surfaces, lattice and operators.
- Changing geometry or sampling behavior.
