# Extensibility refactor

This change is a strangler refactor of Parametrica's extension points. It does
not add a new generator family or redesign the UI.

Read in this order:

1. `proposal.md` — motivation, scope and non-goals.
2. `design.md` — decisions, boundaries, migration and risks.
3. `tasks.md` — phased implementation and verification.
4. `specs/` — capability deltas.

The main outcomes are:

- generator capabilities instead of `helix`/`parametric-3d` checks;
- schema-owned advanced classification;
- a parameter-type registry and one StageEditor;
- validated registry contracts and formal hooks;
- notebook workspace and repository boundaries;
- injectable dialogs;
- responsibility-based helper modules.
