## Why

Surface lattice is the last untyped generator and emits the world network used
by Fabricate and the lattice preview.

## What Changes

- Convert `generators/surfaceLattice.js` to `.ts`.
- Type lattice params, network cells/edges, cache entries and projection.
- Keep the JS compatibility export and update the generator index/check.

## Out of Scope

- Operators, geometry kernels and UI.
