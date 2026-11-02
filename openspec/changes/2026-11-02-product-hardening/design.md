## Context

See `proposal.md` for findings and classification. This design covers only the
mandatory hardening slice H1–H5. LOOK ownership, appearance expansion and
per-pass settings are recorded as follow-ups, not decided here.

## Goals / Non-Goals

**Goals:**

- Correct layer-scoped diagnostic analysis.
- Remove false affordances in blend, layer lock and render-pass toggles.
- Prevent silent export divergence.
- Keep existing documents loading without a version bump.

**Non-Goals:**

- Reorganizing LOOK or moving Image/Animation/Timeline.
- Adding fill gradients, ramp presets or per-pass settings.
- Changing lock selection semantics, render-mode scope or history scope.
- MAKE, solids, CSG, STL/3MF or a new renderer.

## Decisions

### D1: Truthfulness is the acceptance rule

For the affected controls, the implementation must choose one of:

- make the control do what it says, or
- remove/disable it with a short explanation.

This applies to `style.blend`, layer lock and render-pass toggles that cannot
run on the current geometry. The control's label or help text must state any
declared scope.

### D2: Layer lock scope

The audit confirms `layer.locked` has no effect. It does not establish that
lock should cover rename, reorder or delete, so the minimum contract proposed
for review is a **content lock**:

| Action | Under content lock | Rationale |
|---|---|---|
| Generator, parameters, equations/harmonics, operators, style | Blocked | Protects authored content |
| Selection, visibility | Available | Inspect/hide without editing |
| Rename, reorder, delete, duplicate | Not claimed | Structural/identity scope needs a separate decision |

The UI may label this “Content lock” or explain the scope. If the product wants
a broader lock, define those actions explicitly before exposing them as
blocked. If no scope is approved, remove or disable the control. Selection
behavior for structural actions is not decided here.

### D3: Blend behavior and decision criteria

Expected behavior if the control remains:

- `normal`, `multiply`, `screen` and `difference` composite each layer's output
  with what is beneath it;
- the mode resets before the next layer;
- the control applies consistently to the active passes, or the UI states which
  passes support it;
- PNG reflects the effect; SVG export states that blend is not represented.

Decision criteria:

1. The effect is visually consistent across the supported passes.
2. Layer isolation is preserved and blend does not leak to the next layer.
3. Painter ordering/depth remains predictable.
4. The cost is acceptable for the current point/mesh budgets.
5. Export behavior is explicit (PNG reflects it; SVG warns).

If any criterion cannot be met, remove or disable the control instead of
shipping a partial, unlabelled implementation. This design does not choose
between implementing and removing; that decision requires validation against
the criteria.

### D4: Layer-scoped diagnostic analysis

The current adapter passes `evaluation.analysis` (combined curves) to every
layer while diagnostic passes index `layer.curves`. Replace this with one of:

1. a lazy `analysis` getter on each `evaluation.layers[i]`;
2. `analyzeAll(layer.curves)` computed lazily in the adapter when a
   layer-scoped diagnostic pass is active;
3. layer analysis carried explicitly in `RenderScene`.

Recommended: option 1 or 2, computed only when `tangents`, `normals`,
`curvature` or an inflection overlay needs it. Global overlays continue to use
combined scene analysis.

The invariant is testable: with two layers, a diagnostic pass on the second
layer must use the second layer's curves and must not read the first layer's
analysis.

### D5: Render-pass applicability metadata

Add optional, backward-compatible metadata to render-pass registration:

```txt
group?: string
description?: string
appliesTo?(data): boolean
```

For this change, only `appliesTo` is mandatory in behavior. `group` and
`description` are UX follow-ups and may be added at the same time only if they
do not expand scope.

The UI disables a pass with a short reason when `appliesTo` is false for all
visible layers, or omits it when it would be meaningless. Passes without
`appliesTo` are assumed applicable. The active state must remain truthful when
geometry changes.

### D6: SVG export fidelity

SVG does not represent every p5 pass. The mandatory contract is disclosure, not
full parity:

- Keep the current SVG stroke/solid-fill output.
- Detect active features that SVG will omit (gradient wireframe, surface fill,
  overlays, diagnostics).
- Show a visible notice listing the omitted features.
- State in the UI/README that PNG is the faithful raster export.

Full SVG parity (gradients, meshes, overlays) is a functional expansion
candidate, not part of this change.

### D7: Compatibility and migration

- No document v4.
- No new required document fields for H1–H5.
- Existing documents continue to load.
- If blend or lock is removed rather than implemented, old documents keep the
  stored field but the UI no longer exposes a false control.

## Non-normative follow-ups

The P1/P2 register in `proposal.md` is the single list of UX, architecture and
expansion work. None of those items are acceptance criteria for this change;
they require separate validation and, where noted, a design decision.

## Risks / Trade-offs

- **Per-layer analysis cost** → compute lazily and only when a diagnostic pass
  or overlay is active.
- **Pass applicability drift** → add a unit test that every pass with
  `appliesTo` returns a truthful result for representative documents.
- **Export warning wording** → be explicit about what is omitted and point to
  PNG for fidelity.
- **Removing blend/lock controls** → old documents keep stored fields but the
  UI no longer promises unsupported behavior.
- **Adding applicability metadata** → keep it optional so third-party/legacy
  passes still register.
- **No document migration** → all changes are code/UI-level or optional
  metadata.

## Open Questions

These are intentionally unresolved and must not become requirements here:

- Is the proposed content-lock scope approved, or should the lock control be
  removed? Should structural/identity actions ever be included?
- Should blend be implemented or removed after applying the D3 criteria?
- Should pass grouping/descriptions ship with applicability or later?
- Should SVG eventually render gradients/meshes, or remain a documented
  subset with PNG as the faithful export?
- What is the final LOOK ownership and whether Image/Animation/Timeline move?
- Do camera/style changes belong in undo/redo?
- Are render modes global or per layer?
- Will Notebook and Presets merge, link or remain separate?
- Is MAKE a mode, a section or a separate workspace?
