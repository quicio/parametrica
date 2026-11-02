## Context

See `proposal.md` and the audit update. This batch contains only non-LOOK
pending items whose solutions are already clear. LOOK work is deferred to
`2026-11-02-look-reorganization`; architecture/expansion items remain out of
scope.

## Goals / Non-Goals

**Goals:**

- Remove the stroke-width duplicate without breaking old documents.
- Expose layer rename, Notebook metadata and the Explore seed.
- Make panel status and telemetry serve different purposes.
- Correct the stale render-pass documentation.

**Non-Goals:**

- No LOOK reorganization, color ramp, camera reset or pass grouping.
- No move of Image/Animation/Timeline or frame export.
- No fill/per-pass/per-layer-mode work.
- No history, SVG parity, Notebook/Presets, layer-lock scope or MAKE work.
- No document v4.

## Decisions

### D1: Layer style owns stroke width

`layer.style.stroke.width` is authoritative.

- `view.strokeWeight` remains serialized and readable for old documents, but
  is always derived from the active layer style during sanitize/sync.
- UI controls write `style.stroke.width`; they do not maintain an independent
  view width.
- Render and SVG continue to read layer style.
- A document with only `view.strokeWeight` migrates it into the active layer
  style during sanitization.
- No document version change.

Alternative rejected: remove `view.strokeWeight` immediately. It would break
readers/tests that still read the legacy field.

### D2: Layer rename is an identity action

- Add a rename action to each layer row.
- Use `App.renameLayer` and the existing `DialogService.prompt`.
- Trim whitespace, reject empty, enforce 80 characters.
- The current content lock does **not** block rename, reorder, delete or
  duplicate; rename is therefore allowed on a content-locked layer. This is
  consistent with the already-approved lock scope.
- Rebuild the panel and status after rename.

Alternative rejected: inline editing. It adds more DOM/focus states for a small
action; the dialog is already used by Notebook projects/series.

### D3: Notebook metadata editor

- Add an edit action per checkpoint.
- The editor exposes:
  - notes: multiline, max 2000 characters;
  - tags: comma-separated, max 12 tags, 24 characters each.
- Save through `Notebook.update(id, { notes, tags })`.
- Persist and reload; clear is allowed.
- Display tags as today; show a notes preview in the editor.
- No storage-version change: v2 already stores the fields.

Use an inline expanded form under the checkpoint rather than a new dialog
service, so the operation stays local to the Notebook item and testable.

### D4: Explore seed is explicit and reproducible

- Add a numeric seed field and a “New seed” action to Explore.
- Use `app.exploreSeed` (UI-only) as the source, so the value survives panel
  rebuilds but is not serialized into the document.
- `Randomize selected` uses the current seed and does **not** advance it.
- Same document + selection + intensity + seed produces the same candidates.
- “New seed” changes the seed (for example, a new random integer).
- Display the active seed in the panel; do not add it to the document.

This changes the previous implicit `randomSeed++` behavior intentionally.

### D5: Status and telemetry split

Panel status owns active-layer context:

```txt
Layer n/total · name · visible/hidden · content locked ·
generator · operators · mods · tracks · projection
```

Canvas telemetry owns performance/global state:

```txt
CURVES · PTS · PEAK · LEN · EVAL ·
T · SEED · STATE
```

Remove `MODEL`, `LAYERS` and `OPS` from telemetry. Keep the panel’s status
line and the canvas telemetry accessible (`role=status`/`aria-live` preserved).

### D6: Documentation

Update `SPEC.md` §11 to the current 14 render passes and 4 overlays. Update any
README/architecture lists or counts affected by this batch. Documentation is
complementary, not a behavioral requirement.

## Risks / Trade-offs

- **Legacy stroke width** → keep the field derived and add migration tests.
- **Layer rename on a content-locked layer** → allowed by the current contract;
  document it so the behavior is not mistaken for a lock bypass.
- **Notebook metadata limits** → use the existing cleanText/cleanTags rules and
  surface validation only if save fails.
- **Seed reproducibility** → ExplorationSession already clamps/rounds; use the
  visible seed exactly and add a same-seed e2e/unit test.
- **Telemetry split** → tests that look for `SEED`, `STATE` and `T` must keep
  passing; remove only duplicated fields.
- **Docs drift** → update the pass table from the registry, not from memory.

## Migration

- No document version bump.
- `view.strokeWeight` remains readable; new writes derive it.
- Notebook metadata fields already exist in v2; no migration.
- Explore seed is UI state only.
- No LOOK section ids or modes change in this batch.

## Open Questions

None blocking this batch. LOOK ownership, frame-export placement, render-mode
scope, history scope, palette/ramp and fill/per-pass expansion remain deferred
to their separate specs.
