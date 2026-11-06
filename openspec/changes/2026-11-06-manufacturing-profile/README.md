# manufacturing-profile

Phase 5 of the geometric evolution. It turns the current heuristic print checks
into a serializable manufacturing profile and an evidence-based report.

The profile does not slice. It records the process assumptions, what was
measured, what was declared by the source and what is unavailable, and it
defines when a warning may block export.

This change depends on the lattice contracts and benefits from refinement, but
it is deliberately usable by any validated Mesh/Solid.
