## Why

The audit and `product-hardening` closed the correctness defects in the current
product. Several non-LOOK gaps remain, all with clear solutions and no need for
another diagnosis. This change is the first implementation-ready batch:

- a single authoritative stroke width;
- layer rename UI;
- Notebook notes/tags editing;
- a visible, reproducible Explore seed;
- distinct status and telemetry readouts;
- the stale render-pass documentation.

LOOK-specific work — color ramp, camera reset, pass grouping, Canvas/Style
split, temporary Work group, Image/Animation/Timeline placement and frame
export — is deferred to `2026-11-02-look-reorganization`.

## Problem review

| Pending problem | Current status | Solution in this batch |
|---|---|---|
| `view.strokeWeight` duplicates `layer.style.stroke.width` | Confirmed architecture debt | Make layer style authoritative; derive legacy view width on load; keep compatibility |
| `App.renameLayer` exists but has no UI | Partial feature | Add a rename action in Layers using the existing dialog |
| Notebook `notes`/`tags` exist in the model but have no editor | Partial feature | Add an edit-metadata action per checkpoint, with validation and persistence |
| Explore randomisation uses an internal seed with no visible control | Partial feature | Add a seed field + New seed; make the current seed reproducible |
| Panel status and telemetry duplicate model/layer/operator information | Confirmed UX issue | Give each readout a distinct responsibility |
| `SPEC.md` §11 lists an outdated render-pass set | Confirmed docs drift | Update the pass/overlay documentation |
| Color ramp, camera reset, pass grouping, Canvas/Style split, Work group | Deferred | `look-reorganization` |
| Image/Animation/Timeline placement and frame export | Deferred | `look-reorganization` |
| Palette/ramp relationship | Deferred | `look-reorganization` / style decision |
| Fill gradients, per-pass settings, per-layer render modes | Deferred | Expansion |
| History/undo scope, SVG parity, Notebook/Presets relation | Deferred | Architecture/export decisions |
| Broader layer-lock scope | Deferred | Product decision; content lock is already specified |
| MAKE, solids, CSG, STL/3MF | Deferred | Future product |
| `setGenerator` retaining operators, projection gating, renderer/document coupling | Not in this batch | Separate architecture decision |

## What Changes

### 1. Stroke-width authority

- `layer.style.stroke.width` is the only authoritative stored width.
- `view.strokeWeight` remains readable for old documents but is derived from
  the active layer style on load/merge.
- Render, SVG and UI read the layer style width.
- No document version bump.

### 2. Layer rename

- Add a rename action to each Layers row.
- Reuse the existing `App.renameLayer` and the dialog service.
- Trim the name, reject empty, enforce the existing 80-character limit.
- Rename is an identity action and is **not** blocked by the current content
  lock; this matches the lock contract already documented.
- Persist and reflect the name in the layer row and status.

### 3. Notebook metadata

- Add an “Edit metadata” action per checkpoint.
- Expose notes (multiline, up to 2000 characters) and tags (up to 12 tags,
  24 characters each).
- Save through the existing Notebook model; persist and reload.
- Display tags as today; show notes in the editor or item detail.
- No notebook storage-version change; the fields already exist.

### 4. Explore seed

- Add a seed field and a “New seed” action to Explore.
- Use the visible seed for randomize; the same document, selection, intensity
  and seed produce the same candidate set.
- Do not advance the seed implicitly after a run; only “New seed” changes it.
- Seed is UI state, not a document field.

### 5. Status and telemetry split

- **Panel status** owns active-layer context: layer index/total, name,
  visibility, content-lock state, generator, operator count/disabled count,
  modulations, track count and projection.
- **Canvas telemetry** owns performance/global state: curves, points, peak,
  length, evaluation time, time, seed and error state.
- Remove duplicated model/layers/operators fields from telemetry.
- Keep both accessible and visually distinct.

### 6. Documentation

- Update `SPEC.md` §11 to the current 14 render passes and 4 overlays.
- Update any README/architecture counts or lists affected by this batch.
- Documentation is complementary, not an additional behavioral defect.

## Capabilities

### New Capabilities

- `product-corrections`: authoritative style width, layer identity editing,
  Notebook metadata editing, reproducible exploration seed, and distinct
  status/telemetry readouts.

### Modified Capabilities

- None.

## Impact

- `src/core/document.js` (legacy stroke-width derivation)
- `src/application/App.js` (rename guard/status/telemetry)
- `src/ui/Controls.js` (rename action, status/telemetry)
- `src/ui/widgets/NotebookPanel.js` (metadata editor)
- `src/ui/widgets/ExplorePanel.js` (seed controls)
- `src/lab/exploration.js` (explicit seed use, if needed)
- `test/lab.smoke.mjs`, `e2e/panel.spec.js`, `e2e/ui.spec.js`, new batch e2e
- `SPEC.md` §11, README/architecture docs

No document v4, no LOOK reorganization, no fill/per-pass/per-layer-mode work,
no MAKE.

## Priority and order

This batch has no P0 correctness item. All items are P1/P2 UX or technical
consistency and can ship in this order:

1. stroke-width authority (touches style/render/export);
2. layer rename;
3. Notebook metadata;
4. Explore seed;
5. status/telemetry split;
6. documentation.

## Non-goals

- No LOOK section split, color ramp, camera reset, pass grouping, Work group or
  Image/Animation/Timeline move.
- No frame-export relocation.
- No fill gradients, per-pass settings or per-layer render modes.
- No history/undo scope change.
- No SVG parity or Notebook/Presets unification.
- No broader layer-lock scope.
- No MAKE, solids, CSG, STL/3MF, new renderer or document v4.
