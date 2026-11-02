## Why

The audit found a working product whose UI is not always truthful about its
own state. A small number of exposed controls are false affordances, one
per-layer diagnostic path uses the wrong data, and SVG export can silently
omit active render features.

This is a **minimal hardening slice**. It does not reorganize the navigation,
add new appearance features or introduce MAKE. UX improvements and functional
expansion are recorded in a non-normative register so they can be validated
separately.

## Findings

### Confirmed defects — mandatory hardening (P0)

| # | Finding | Impact | Evidence |
|---|---|---|---|
| H1 | Layer-scoped `tangents` / `normals` / `curvature` passes receive combined analysis while indexing a layer's curves | Wrong diagnostics; correctness | `P5Adapter.js`, `analysis/differential.js` |
| H2 | `style.blend` is exposed and persisted but no pass applies it; resolution criteria are documented in design D3 | False affordance / unresolved behavior | `document.js`, `Controls.js`; no `blendMode` in `src/render` |
| H3 | `layer.locked` is exposed but does not prevent any mutation; the intended scope is undefined and a content-lock contract is proposed below | False affordance / undefined contract | `App.setLayerLocked`, `Controls.js` |
| H4 | Render passes appear as effective toggles when they cannot run on the current geometry | False affordance | `epicycles.js`, `surface.js` early returns |
| H5 | SVG export emits curves and solid fill only and silently omits active render features | Trust / output fidelity | `Exporter.js` |

### Layer lock scope (H3)

The audit confirms the flag has no effect; it does **not** establish that lock
must cover rename, reorder or delete. The minimum contract proposed for review
is a **content lock**:

| Action | Expected under content lock | Basis |
|---|---|---|
| Generator, parameters, equations/harmonics, operators, style | Blocked | Protects the layer's authored content |
| Selection, visibility | Available | Inspect and hide without changing content |
| Rename, reorder, delete, duplicate | Not claimed | Structural/identity scope is a separate product decision |

If a broader lock is wanted, it must be defined before the UI presents it. The
control label/description must state the scope. If no scope is approved, the
control is removed or disabled rather than left as a no-op.

### Blend resolution (H2)

Expected behavior if the control stays:

- `normal`, `multiply`, `screen` and `difference` composite each layer's output
  with the layers beneath it;
- the mode resets before the next layer;
- the control applies consistently to the active passes, or the UI states
  which passes support it;
- PNG reflects the effect; SVG export states that blend is not represented.

The implement-vs-remove decision is recorded in `design.md` D2. It is not
decided here.

### Recommendation register — non-normative

| Recommendation | Type | Priority | Status |
|---|---|---|---|
| `view.colorRamp` editor for gradient wireframe | UX | P1 | Proposed; depends on style/ramp decision |
| Palette/ramp relationship | UX | P2 | Proposed; requires a design decision |
| Render-pass grouping and descriptions | UX | P1 | Proposed; `appliesTo` hardening can ship first |
| Explicit global/layer/viewport scope labels | UX | P1 | Proposed |
| Camera reset and explicit viewport controls | UX | P2 | Proposed |
| Visible/repeatable Explore random seed | UX | P1 | Proposed |
| Move or link frame-sequence export from Timeline to Export | UX | P2 | Proposed |
| Deduplicate panel status and telemetry | UX | P2 | Proposed |
| Layer rename UI | UX | P2 | Proposed |
| Notebook notes/tags editing (or remove the unused model fields) | UX | P2 | Proposed |
| English/Spanish copy consistency | UX | P2 | Proposed |
| Update SPEC.md §11/§16 and README render-pass/export docs | Docs | P2 | Proposed; docs drift from the registry |
| Single authoritative stroke width (`view.strokeWeight` duplicate) | Architecture | P2 | Proposed |
| Split global canvas/view state from per-layer style | Architecture | P2 | Proposed; requires design decision |
| Per-layer render modes | Architecture | P2 | Proposed; requires design decision |
| Fill gradients (linear/radial, stops, angle) | Expansion | P2 | Out of mandatory scope |
| Ramp presets and gradient source selector | Expansion | P2 | Out of mandatory scope |
| Per-pass settings schema and persistence | Expansion | P2 | Out of mandatory scope |
| Full SVG parity with gradients, meshes and overlays | Expansion | P2 | Out of mandatory scope |
| Notebook/Presets shared identity or explicit relation | Architecture | P2 | Out of mandatory scope |
| Separate viewport history from geometry history | Architecture | P2 | Requires design decision |
| MAKE, solids, CSG, STL/3MF, 3D viewport | Expansion | Later | Not part of the current product |

### Pending proposal — LOOK ownership

The audit shows that LOOK currently contains camera, canvas, style, render,
diagnostics, image, animation and timeline. A possible grouping is:

```txt
Camera · Canvas · Style · Render · Overlays
```

This is **a proposal pending validation**, not a requirement of this change. It
must not become tasks until the open questions about Image, Animation and
Timeline are answered.

## What Changes

The mandatory slice is limited to H1–H5:

- Use layer-scoped analysis for layer diagnostic passes; keep global overlays
  on combined analysis.
- Make the blend control truthful: either apply it in rendering or remove it.
- Make layer lock truthful: either enforce it or remove the affordance.
- Add render-pass applicability metadata; disable/hide inapplicable passes
  with a reason.
- Make SVG export declare omitted active features instead of silently dropping
  them; keep PNG as the faithful raster export.

No navigation change, no fill-gradient work, no per-pass settings and no MAKE
are part of this change. README/SPEC updates are complementary documentation,
not a sixth P0 defect.

## Capabilities

### New Capabilities

- `ui-integrity`: exposed controls are truthful, layer diagnostics use layer
  data, and export does not silently diverge from the active render scene.

### Modified Capabilities

- None.

## Impact

- `src/application/renderSceneBuilder.js`, `src/render/p5/P5Adapter.js`
- `src/render/passes/*.js`, `src/core/registry.js`
- `src/ui/Controls.js`, `src/application/App.js`
- `src/export/Exporter.js`
- `test/lab.smoke.mjs`, `e2e/ui.spec.js`
- `SPEC.md`/README: render-pass and export-limitation notes

No document v4, no new renderer, no navigation rewrite, no MAKE.

## Prioritization rationale

- **P0 — hardening**: false affordances or wrong data; already visible to the
  user; no new product capability; small-to-medium effort.
- **P1 — UX**: existing features that are hard to discover or complete; useful
  but not correctness-critical.
- **P2 — architecture/expansion**: model changes or new behavior that need
  separate design and validation.

P1 and P2 are planning context only. They are not acceptance criteria for this
change.

## Non-goals

- No navigation reorganization (including LOOK).
- No fill-gradient or ramp-preset work.
- No per-pass settings schema.
- No unified Notebook/Presets model.
- No MAKE, solids, CSG, STL/3MF, new renderer or 3D viewport.
- No document v4 migration.
- No decision on layer-lock selection semantics, global vs per-layer modes or
  camera/style history.
