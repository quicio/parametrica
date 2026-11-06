# export-integrity

Small prerequisite slice for the manufacturing and refinement work. It closes
two residual contract gaps found in the architecture audit:

- 3MF currently writes only the first three indices of a face, so a quad loses
  a triangle.
- `manifoldGuaranteed` is a trust flag that must not survive post-processing
  which changes topology.

This change does not add features to the lattice. It makes the export and
validation evidence trustworthy before manufacturing thresholds are layered on
top.
