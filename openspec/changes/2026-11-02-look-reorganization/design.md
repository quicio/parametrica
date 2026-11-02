## Context

See `proposal.md` and the audit. `product-hardening` already made the current
LOOK truthful: blend works, layer diagnostics are scoped and inapplicable
passes are disabled. The remaining problem is ownership and scope.

This design specifies Phase 1 (the section split) and records Phase 2
(relocating Image/Animation/Timeline) as a pending navigation decision.

## Goals / Non-Goals

**Goals:**

- Make LOOK read as appearance + viewport, not as a mixed toolbox.
- Make global, active-layer and viewport scopes explicit.
- Keep camera, canvas, style, render and overlays independently discoverable.
- Expose the existing `view.colorRamp` setting.
- Preserve the four-mode shell in Phase 1.

**Non-Goals:**

- No fill-gradient/new-fill implementation.
- No per-pass settings or per-layer render modes.
- No history/undo scope change.
- No move of Image/Animation/Timeline in Phase 1.
- No Notebook/Presets, MAKE or export-parity work.

## Decisions

### D1: LOOK has five Phase-1 sections

```txt
Camera   → projection, guides, reset
Canvas   → artboard preset/size, background, margin
Style    → active-layer stroke, fill, blend, palette
Render   → grouped render passes + color ramp editor
Overlays → diagnostic overlays
```

`Image`, `Animation` and `Timeline` remain reachable in a temporary **Work**
group at the end of LOOK. The group is explicitly temporary; Phase 2 decides
where those tools live.

Alternative rejected: keep one `View` and one `Artboard` section with internal
headings. That still hides the scope boundary and preserves the overloading.

### D2: Scope is stated, not inferred

Each section/control declares its scope:

| Scope | Examples |
|---|---|
| Global viewport | Projection, guides, camera |
| Global document | Artboard size/background/margin, overlays, render modes |
| Active layer | Stroke, fill, blend, palette |
| Global render | Color ramp (current global setting; per-layer ramps are out of scope) |
| Workspace/session | Image underlay |
| Global time | Animation, timeline duration/fps/loop |
| Layer/timeline | Timeline tracks |

The style section gets an explicit “Active layer” label. Canvas and Camera are
labeled global. The render section explains that modes are global while styles
are per layer.

This change does **not** split `view.style` from the active-layer alias or make
render modes per layer; those remain architectural decisions.

### D3: Render browser groups

Add optional pass metadata:

```txt
group: 'base' | 'surface' | 'color' | 'diagnostic'
description: string
```

Proposed groups:

- **Base**: Stroke, Points.
- **Surfaces**: Surface Fill, Surface Wireframe.
- **Color**: Gradient Wireframe, Curvature Heatmap.
- **Diagnostics**: Wireframe, Control Polygon, Tangents, Normals, Negative
  Space, Signed Distance, Topology, Epicycles.

The UI shows group headings and descriptions. It preserves the existing
`appliesTo` disabling from `product-hardening`. Pass settings are not added in
this phase.

### D4: Camera reset

Add a `Reset camera` action in Camera:

- resets `view.camera.yaw`, `pitch` and `fov` to `DEFAULT_CAMERA`;
- is disabled or hidden in orthographic projections;
- is recorded through the existing history/rebuild path.

No yaw/pitch/fov sliders are added in Phase 1; the camera remains primarily
pointer-driven.

### D5: Color ramp editor

Expose the existing `view.colorRamp`:

- 2–6 color stops;
- add/replace/remove;
- reset to `DEFAULT_COLOR_RAMP`;
- live preview;
- writes only `view.colorRamp`.

The palette/ramp relationship is **not** decided here. Palettes keep their
current behavior; a palette ramp or automatic sync is a separate decision.
Per-layer ramps are also out of scope.

### D6: Temporary Work group

Until Phase 2:

- keep `Image`, `Animation` and `Timeline` under a visible “Work” group label;
- do not rename them to “Look” controls;
- make the temporary status explicit in copy/help.

This avoids a navigation change without a decision while removing the false
impression that they are appearance controls.

### D7: Phase 2 placement options

Recommended option: two new modes.

| Option | Shape | Notes |
|---|---|---|
| **A. Ingest + Perform** | `FORM · LOOK · EXPLORE · PERFORM · INGEST · KEEP` | Clear ownership; larger mode bar |
| **B. One Work mode** | `FORM · LOOK · EXPLORE · WORK · KEEP` with Image/Animation/Timeline inside | Smaller mode bar; still mixes ingest and time |
| **C. Keep in LOOK** | Current temporary Work group | No navigation change; LOOK remains mixed |

Decision criteria: conceptual ownership, mode-bar complexity, discoverability,
persistence/migration, and future MAKE needs. No option is selected by this
change. Frame export follows the same decision: Export, Perform or both.

### D8: UI state migration

`parametrica.ui.v1` stores open/closed state by section id. The split changes
ids (`view` → camera/render/overlays; `artboard` → canvas/style). The
implementation must migrate or default the old state without breaking stored
modes:

- old `view` open state → Camera (and optionally Render/Overlays);
- old `artboard` open state → Canvas and Style;
- unknown ids fall back to defaults;
- no document changes.

### D9: No document changes

The reorganization is UI-only. It does not alter the document, presets,
notebook, session or export formats. No document v4.

## Risks / Trade-offs

- **UI state migration** → losing accordion state is acceptable, but the mode
  and unknown sections must not break. Add migration tests.
- **Muscle memory** → users expect `View`/`Artboard`; labels must be clear and
  the change should be staged.
- **More accordions** → five sections can make the panel longer. Defaults
  should keep Camera/Canvas/Style collapsed except where useful, and persisted
  state should survive.
- **Color ramp scope** → a global ramp editor is simple but does not solve
  per-layer gradients. Document that limitation.
- **Temporary Work group** → LOOK is still not fully appearance-only until
  Phase 2. Do not claim otherwise.
- **Render grouping** → group metadata can drift from actual pass behavior; add
  a unit test that every pass has a valid group.
- **Camera reset** → resetting 3D camera can surprise users; keep it explicit.

## Open Questions

- Phase 2: Ingest + Perform, one Work mode, or keep in LOOK?
- Does frame export belong to Export, Perform or both?
- Are render modes global or per layer?
- Does camera/style belong in undo/redo?
- Does the palette define a ramp, and is the ramp global or per layer?
- Should fill gradients and per-pass settings be a later LOOK “appearance”
  expansion?
- Should status/telemetry be deduplicated as part of a separate global pass?
