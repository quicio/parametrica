# organic-struts

Phase 2 of the organic lattice evolution. It consumes the Phase 1
`LatticeNetwork` and replaces constant-radius tubes plus low-poly sphere joints
with curved centerlines in surface coordinates, variable radius and selectable
joint styles (technical, rounded, blend), under explicit quality and performance
budgets. The local SDF blend is a benchmarked candidate, not a settled
implementation; `rounded` remains the fallback.
The finish quality is separate from the existing repair/SDF quality.

The brief received ends at “Control…”; this proposal assumes controlled
density, curvature, thickness, openings and manufacturing constraints. Confirm
before archiving.
