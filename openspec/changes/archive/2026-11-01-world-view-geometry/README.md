# World / view geometry architecture

This OpenSpec change is the Phase 2 deliverable for Parametrica's spatial
architecture. It does not implement surfaces, meshes or solids yet. It defines
the contracts and migration path required before those features can be added.

Read in this order:

1. `proposal.md` — motivation, scope, capabilities and non-goals.
2. `design.md` — target architecture, contracts, data flow, compatibility,
   migration strategy, risks and rejected alternatives.
3. `tasks.md` — implementation phases with acceptance criteria.
4. `specs/` — behavioural deltas.

Core decisions:

- world geometry is canonical and camera-independent;
- `Curve2D`, `Curve3D`, `Surface`, `Mesh` and `Solid` are explicit data kinds;
- operators declare geometry type and `world`/`view` space;
- `RenderScene` isolates p5 from application state;
- document v3 remains unchanged;
- legacy `Curve[]` and `x3/y3/h3` are preserved through adapters;
- the first implementation phase covers world/camera separation and 3D
  transform coherence.
