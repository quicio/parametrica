## Why

`product-hardening` fixed the correctness/truthfulness defects in the current
LOOK: layer analysis, blend, pass applicability and SVG disclosure. It did not
fix LOOK's information architecture.

LOOK still owns camera, canvas, style, render, overlays, image ingest,
animation and timeline. The audit's confirmed UX problem is not a missing
feature; it is that unrelated jobs share one section and one scope.

This change specifies a staged reorganization. It is a design/spec proposal,
not an implementation request. Phase 1 can ship without changing the four-mode
shell. Phase 2 relocates ingest/time tools and is explicitly pending
validation.

## Problem review

All registered problems were reviewed. Disposition:

| Registered problem | Disposition in this spec |
|---|---|
| LOOK over-concentrates camera, canvas, style, render, diagnostics, image, animation and timeline | **In scope (Phase 1/2)** |
| “Artboard” mixes global canvas and active-layer style | **In scope (Phase 1)** |
| Render toggles are a flat list without groups/descriptions | **In scope (Phase 1)** |
| `view.colorRamp` has no editor | **In scope (Phase 1)** |
| Camera has no reset/explicit viewport controls | **In scope (Phase 1)** |
| Palette/ramp relationship | Ramp editor in Phase 1; palette sync is a pending decision |
| Projection is gated by the active layer in mixed 2D/3D documents | Out of scope; possible issue noted in the audit |
| P5Adapter reads document state for animation/artboard/underlay | Out of scope; architecture dependency |
| SPEC §11 render-pass list is stale | Out of scope; docs follow-up |
| Image, Animation and Timeline live in LOOK | **Phase 2 pending decision** |
| Frame export lives in Timeline rather than Export | **Phase 2 pending decision** |
| Status and telemetry duplicate information | Out of scope; global UX follow-up |
| `view.strokeWeight` duplicates `style.stroke.width` | Out of scope; architecture dependency |
| `view.style` is an active-layer alias while other view settings are global | Phase 1 makes scope explicit; full model split out of scope |
| Render modes are global while style is per layer | Decision required; out of Phase 1 |
| Camera/style changes enter undo/redo | Decision required; out of scope |
| Passes hardcode appearance and lack per-pass settings | Out of scope; expansion |
| Fill is solid-only; no gradients | Out of scope; expansion |
| SVG is a subset of the render scene | Out of scope; export follow-up |
| Layer lock content scope (FORM) | Out of scope; already specified |
| Notebook/Presets overlap and metadata UI | Out of scope |
| Explore seed and observation/ask placement | Out of scope |
| MAKE / solids / fabrication | Out of scope |
| Blend, per-layer analysis and pass applicability | Already resolved by `product-hardening`; preserve |

## What Changes

### Phase 1 — LOOK information architecture (normative)

Split LOOK into five sections with explicit ownership:

```txt
LOOK
├─ Camera
│  ├─ Projection
│  ├─ CAD guides
│  └─ Reset camera
├─ Canvas
│  ├─ Artboard preset / width / height
│  ├─ Background
│  └─ Margin
├─ Style · active layer
│  ├─ Stroke
│  ├─ Fill (current capabilities only)
│  ├─ Blend
│  └─ Palette
├─ Render
│  ├─ Base passes
│  ├─ Surface passes
│  ├─ Color passes + color ramp editor
│  └─ Diagnostic passes
└─ Overlays
```

- Move camera/pass/overlay controls out of the current `View` section into
  `Camera`, `Render` and `Overlays`.
- Move global canvas controls out of `Artboard` into `Canvas`.
- Move active-layer style controls out of `Artboard` into `Style`.
- Label each section/control as **global**, **active layer**, **viewport** or
  **workspace** where ambiguity exists.
- Group render passes by intent and add user-facing descriptions. Preserve the
  `appliesTo` behavior from `product-hardening`.
- Add a camera reset action.
- Add an editor for the existing `view.colorRamp` setting.
- Keep Image, Animation and Timeline temporarily reachable in a clearly
  labeled **Work** group at the end of LOOK. Do not move them in Phase 1.

### Phase 2 — Ingest and time ownership (pending validation)

Recommended target:

- Image → a dedicated **Ingest** entry point (or FORM if a “create document
  from image” flow is preferred).
- Animation + Timeline → a dedicated **Perform** mode.
- Remove the temporary Work group from LOOK.
- Decide whether frame export belongs to Export, Perform or both.

Phase 2 requires a navigation decision and is not part of Phase 1 acceptance.

## Capabilities

### New Capabilities

- `look-workspace`: a LOOK section organized by camera, canvas, active-layer
  style, render passes and overlays, with explicit scope and a staged
  relocation of ingest/time tools.

### Modified Capabilities

- None.

## Impact

- `src/ui/Controls.js`, `src/applications/App.js` (camera reset)
- `src/render/passes/*.js` (pass group/description metadata only)
- `src/render/palettes.js` and `style.css` if the ramp editor needs a palette
  preset surface
- `src/core/document.js` only for optional view/palette metadata, if needed
- `test/lab.smoke.mjs`, `e2e/ui.spec.js`, `e2e/panel.spec.js`, new LOOK e2e
- `README.md`, `docs/architecture.md`, `SPEC.md` §16

No document v4, no fill-gradient/per-pass/per-layer-mode implementation, no
MAKE, no export parity, no layer-lock changes.

## Phases and priority

| Phase | Scope | Impact | Dependency |
|---|---|---|---|
| **Phase 1** | Camera/Canvas/Style/Render/Overlays split, scope labels, pass groups, camera reset, color-ramp editor, temporary Work group | High UX clarity | `product-hardening` |
| **Phase 2** | Move Image/Animation/Timeline, remove Work group, decide frame export | High navigation impact | Product decision on modes |
| **Out of scope** | Fill gradients, per-pass settings, per-layer render modes, SVG parity, Notebook/Presets, history scope, MAKE | Strategic/expansion | Separate validation |

## Non-goals

- No implementation of fill gradients or new fill modes.
- No per-pass settings schema.
- No per-layer render modes.
- No change to undo/redo/history scope.
- No move of Image/Animation/Timeline in Phase 1.
- No Notebook/Presets unification.
- No MAKE, solids, CSG, STL/3MF or new renderer.
- No document v4 migration.
