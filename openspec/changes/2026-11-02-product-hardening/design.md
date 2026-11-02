## Context

See the audit context and `proposal.md`. The current code has four modes and
19 sections; LOOK owns camera, canvas, style, render, diagnostics, image,
animation and timeline. Several controls are truthful only in appearance:
`style.blend` is never applied, `view.colorRamp` has no editor, layer lock does
not lock, and per-layer diagnostic passes receive combined analysis.

This design covers **current-product hardening**. It does not introduce MAKE,
a 3D renderer or a navigation rewrite.

## Goals / Non-Goals

**Goals:**

- Make every exposed control have an observable effect, or remove/disable it
  with an explanation.
- Make global, document, layer, viewport and session scopes explicit in the UI
  and model.
- Fix layer-scoped analysis and export divergence.
- Expose existing style/render settings that are already in the model.
- Leave a low-risk path to per-pass settings and future composition.

**Non-Goals:**

- Deciding the final LOOK/MAKE navigation.
- Implementing solids, CSG, STL/3MF or a 3D viewport.
- Introducing document v4.
- Merging Notebook and Presets.
- Rewriting the renderer.

## Decisions

### D1: Truthful controls are a hard invariant

Every visible control must change something observable in the current product.
If a feature is not implemented:

- remove it, or
- show it disabled with a short reason.

For this slice:

- Apply `style.blend` in the p5 layer loop, or remove the control.
- Apply `view.colorRamp` from a UI editor.
- Enforce layer lock or remove the lock affordance.
- Disable/hide passes that cannot run on the current geometry.

### D2: Blend application

Map the stored blend value to p5 constants inside `P5Adapter.drawFrame` per
layer:

```txt
normal → p.BLEND
multiply → p.MULTIPLY
screen → p.SCREEN
difference → p.DIFFERENCE
```

Set the mode before drawing a layer, and reset to `p.BLEND` after the layer.
Do not rely on `push/pop` preserving blend state. Passes that draw through
`drawingContext` gradients inherit the current blend mode.

Alternative rejected: keep the control and document it as decorative. That
violates the truthfulness invariant.

### D3: Color ramp editor and palettes

Add a compact editor for `view.colorRamp`:

- 2–6 swatches;
- add/remove/reorder or at least replace;
- presets (e.g. spectrum, heat, cool, mono);
- reset to `DEFAULT_COLOR_RAMP`.

`colorRamp` remains a document-level view setting because the current pass is
global. Per-layer ramps are a P2 decision, not part of this slice.

Palettes may declare an optional `ramp`. Applying a palette:

- writes background/stroke/fill as today;
- writes `view.colorRamp` when the palette declares one;
- leaves the current ramp untouched when it does not.

This makes the relationship explicit without removing existing palettes.

### D4: Layer lock semantics

Recommended semantics for the current product:

- A locked layer may be selected for inspection.
- All mutating controls for that layer are disabled: generator, parameters,
  equations, harmonics, operators, style, rename, reorder, delete.
- Visibility may still be toggled.
- Unlocking is explicit.

If this is not the desired product behavior, the alternative is to remove the
lock control until it is designed. The implementation must not leave a lock
affordance that does nothing.

### D5: Layer-scoped analysis

Do not pass the combined `evaluation.analysis` to every layer. Options:

1. `evaluateLayers` exposes a lazy `analysis` getter per layer.
2. `P5Adapter` computes `analyzeAll(layer.curves)` lazily for the active
   analysis passes.
3. `RenderScene` carries layer analysis explicitly.

Recommended for this slice: option 1 or 2. Compute analysis only when a pass
needs it (`tangents`, `normals`, `curvature`, inflections), and keep overlays
on the combined scene analysis.

The invariant is: a layer pass indexes the analysis of the same layer's curves.

### D6: Stroke width single source

`layer.style.stroke.width` is authoritative.

- `view.strokeWeight` remains readable for old documents but is derived from
  the active layer style.
- New writes do not create an independent `strokeWeight`.
- Render and export read layer style.
- A document without `view.style` still migrates through
  `sanitizeDocument`.

No document version bump is required.

### D7: Render pass metadata and applicability

Extend render-pass registration with optional, backward-compatible metadata:

```txt
group: 'base' | 'surface' | 'color' | 'diagnostic'
description: string
appliesTo(data): boolean
settings?: parameter schema
```

For this slice, use `group`, `description` and `appliesTo`. Pass settings can
ship as P2.

The UI:

- groups toggles by `group`;
- shows descriptions on hover/help;
- disables or hides a pass when `appliesTo` is false for all visible layers;
- keeps the active state honest when a pass becomes inapplicable.

### D8: Export fidelity contract

SVG cannot represent every p5 pass. The contract for this slice:

- Export what the current SVG builder already supports (stroke, solid fill,
  layer styles).
- Detect active features that SVG will omit: gradient wireframe, surface fill,
  overlays, other diagnostic passes.
- Surface a notice listing omitted features.
- Document the supported set in the UI or README.

Full SVG parity (gradients, meshes, overlays) is P2.

PNG remains the faithful raster export and should be described that way.

### D9: Fill and gradient customization

Add a fill mode to the style model:

```txt
mode: 'none' | 'solid' | 'linear' | 'radial'
color, opacity, stops, angle
```

Backward compatibility: `enabled: true` maps to `solid`, `false` to `none`.
The existing `stroke` pass and `surface-fill` read the new fields. A shared
paint helper owns gradient construction so curves and meshes behave
consistently.

This is a P1 slice; per-pass fill/settings are P2.

### D10: Navigation clarity without a final rewrite

This design does not choose the final navigation. It requires that controls
announce their scope and that LOOK can be split without changing the four-mode
shell:

- Camera: projection, guides, reset.
- Canvas: artboard, background, margin.
- Style: active layer stroke/fill/blend/palette.
- Render: grouped passes + applicable settings.
- Overlays: diagnostics.

Image, Animation and Timeline remain where they are until the user decides
whether to move them to Ingest/Perform/Keep.

### D11: Reproducible exploration and notebook metadata

- Add a visible seed and a “new seed” control to Explore randomize.
- Add notes/tags editing to Notebook, or remove those fields from the model if
  they are not wanted.

These are small truthfulness/clarity fixes, not a redesign.

## Risks / Trade-offs

- **Blend modes can be expensive** on large scenes. Keep per-layer application
  and avoid changing modes per pass unless necessary.
- **Per-layer analysis adds computation** if done eagerly. Compute lazily and
  only when a diagnostic pass or overlay is active.
- **Removing `view.strokeWeight`** could break old documents/tests. Keep a
  derived compatibility field and add migration tests.
- **Pass applicability metadata** can drift from `draw` behavior. Add tests
  that every registered pass exposes a group and a truthful `appliesTo` where
  applicable.
- **Export warnings may be perceived as limitations**. Pair them with a clear
  “PNG is the faithful raster export” message.
- **Layer lock enforcement** can block users who relied on the old no-op
  behavior. Provide an obvious unlock action.
- **LOOK grouping without moving Image/Animation/Timeline** may still leave
  LOOK long. This is a deliberate first step, not the final navigation.
- **No document v4**: all additions are optional style/view fields with
  defaults; existing documents keep loading.

## Migration Plan

1. Ship P0 fixes behind existing document fields; no format bump.
2. Add new optional style/view fields (`fill.mode`, `fill.stops`, `ramp` in
   palettes, pass metadata).
3. Keep `view.strokeWeight` readable/derived for old documents.
4. Add UI sections and warnings without removing existing entry points.
5. P2 items stay as recommendations until separately specified.

## Open Questions

These are intentionally **not** decided by this change:

- Final ownership of Image, Animation and Timeline.
- Whether Notebook and Presets merge.
- Whether render modes become per layer.
- Whether camera/style changes belong in undo/redo.
- Whether layer lock should block selection or only mutation.
- Whether SVG should eventually render gradients and meshes.
- Whether MAKE is a mode, a section or a separate workspace.
