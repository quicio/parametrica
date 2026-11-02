# LOOK reorganization

Staged specification for making LOOK a clear appearance/viewport workspace.

Read in order:

1. `proposal.md` — full problem review, Phase 1/2 scope and non-goals.
2. `design.md` — section ownership, scope, pass groups, camera reset, ramp
   editor, temporary Work group and Phase 2 options.
3. `tasks.md` — Phase 1 checklist and pending Phase 2 items.
4. `specs/look-workspace/spec.md` — behavioural contract.

Phase 1 target:

```txt
Camera · Canvas · Style · Render · Overlays
```

Image, Animation and Timeline stay reachable under a temporary Work label until
a Phase 2 navigation decision is approved.

Out of scope:

- fill gradients and new fill modes;
- per-pass settings and per-layer render modes;
- history/undo scope;
- moving ingest/time tools in Phase 1;
- Notebook/Presets, MAKE, export parity and document v4.
