## Why

Generator infrastructure and the classic 2D families are the foundation of the
generator layer. They were still JavaScript and their param handling drove the
dynamic registry boundary.

## What Changes

- Convert `generators/context`, `compose`, `helpers` to `.ts`.
- Convert `lissajous`, `rose`, `superformula`, `harmonicOscillator` and
  `parametric` to `.ts`.
- Add typed generator contexts, composed curve helpers and per-generator param
  interfaces.
- Fix the sampling/parametric return type to match the actual point arrays.
- Keep JS compatibility re-exports and update the generator index/check.

## Out of Scope

- Attractors, helix, splines, Fourier, surfaces, lattice and operators.
- Changing sampling, generator output or registry behavior.
