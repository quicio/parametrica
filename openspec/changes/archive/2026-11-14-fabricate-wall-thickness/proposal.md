## Why

The manufacturing report marks minimum wall as `unavailable` because no
mesh-based estimator exists. That leaves the strongest fabrication claim
unverified for every hollow body, including the vase and lattice presets.

## What Changes

- Add a deterministic wall-thickness estimator over the prepared mesh.
- Sample triangle centroids by area and cast inward rays against a BVH.
- Report min, p05 and median thickness in millimetres with the sample count.
- Mark the manufacturing check `estimated`, never `measured`.
- Keep open or empty meshes `unknown`, not passing.
- Cover the estimator with Node fixtures and one e2e Fabricate flow.

## Out of Scope

- Slicer integration, support generation or print-time prediction.
- Changing the manufacturing minima or gating policy.
- Changing geometry, export bytes or the document format.
