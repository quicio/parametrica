# Surface twisted seams

Next surface slice after `parametric-surfaces` and the open-endpoint fix.

Read in order:

1. `proposal.md` — scope, capabilities and non-goals.
2. `design.md` — seam modes, corner mapping, mesh metadata and curves.
3. `tasks.md` — implementation phases and acceptance criteria.
4. `specs/` — behavioural deltas.

Scope summary:

- `seamU` / `seamV` modes on `parametric-surface`;
- reversed seam welding with mirrored opposite coordinates;
- shared seam vertices, no crack or doubled boundary;
- mirrored compatibility loops for stroke/SVG;
- Möbius Band preset updated to a welded reversed U seam;
- no document v4, no new renderer, no General topology solver.
