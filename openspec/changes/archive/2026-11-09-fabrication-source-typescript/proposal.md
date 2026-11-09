## Why

`fabricationSource` is the application seam between evaluated geometry and the
Fabricate/export/report surfaces. It carries candidates, repairs, booleans,
grouped recipes, lattice and perforation data and was the largest untyped
application module.

## What Changes

- Convert `application/fabricationSource.js` to `.ts`.
- Type evaluation/layer/mesh inputs, candidates, sources, grouped recipes and
  reports.
- Keep the JS compatibility re-export.
- Cast JS geometry/CSG adapter calls at the boundary.

## Out of Scope

- `App.js`.
- Changing fabrication selection, boolean, lattice, perforation or report
  behavior.
