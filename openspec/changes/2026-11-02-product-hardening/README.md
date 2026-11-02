# Product hardening

Audit-driven improvements for the **current** Parametrica product.

Read in order:

1. `proposal.md` — findings, confirmed defects, recommendations, priority.
2. `design.md` — technical approach, decisions and migration.
3. `tasks.md` — P0/P1 implementation checklist and deferred P2 items.
4. `specs/ui-integrity/spec.md` — behavioural contract.

Scope summary:

- truthful controls: blend, layer lock, pass applicability;
- explicit global/layer/viewport/workspace scope;
- layer-scoped diagnostic analysis;
- editable gradient ramp and connected palettes;
- fill modes and gradient controls;
- single authoritative stroke width;
- export-fidelity disclosure for SVG;
- Explore seed and Notebook metadata only as small clarity fixes.

Out of scope:

- MAKE, solids, CSG, STL/3MF;
- document v4;
- new renderer or 3D viewport;
- final navigation rewrite or Notebook/Presets merge.
