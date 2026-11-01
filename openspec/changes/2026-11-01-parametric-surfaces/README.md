# Parametric surfaces

Next OpenSpec slice after `world-view-geometry`.

Read in order:

1. `proposal.md` — scope, capabilities and non-goals.
2. `design.md` — surface grid, seam rules, tessellation, rendering and caches.
3. `tasks.md` — implementation phases and acceptance criteria.
4. `specs/` — behavioural deltas.

Scope summary:

- first `parametric-surface` generator;
- world `Surface` geometry;
- deterministic Surface → Mesh tessellation with normals;
- Surface/Mesh projection and p5 wireframe/fill rendering;
- surface analysis and caches;
- no solids, CSG, Three.js or STL/3MF yet.
