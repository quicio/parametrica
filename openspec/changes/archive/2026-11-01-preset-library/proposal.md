## Why

The preset library is now a 40-entry categorized catalog, but it is still
text-only and stateless: users cannot recognize a form before opening it, keep
a shortlist, or return to what they just used. For a workbench whose value is
visual discovery, that makes the library feel like a list of filenames.

This slice turns it into a visual, personal workspace: deterministic previews,
favorites and recent presets. It builds on the shipped catalog, categories and
accent-insensitive search without changing the document format, preset JSON or
renderer.

## What Changes

- Add deterministic, derived preview thumbnails for built-in and user presets.
  - Evaluate the preset document offscreen at `time = 0` with a fixed preview
    profile.
  - Render projected compatibility curves (wireframe) with the existing
    `curvesDataURL` helper.
  - Generate lazily, cache in memory, and invalidate by document hash and
    preview-profile version.
  - Persist small previews only for user presets; never inside preset JSON.
- Add favorites and recents in workspace metadata.
  - Star/unstar a preset without applying it.
  - Record every successful preset application.
  - Recents are most-recent-first, deduped and capped at 8.
  - Persist under a versioned `parametrica.presets.meta.v1` key, sanitized and
    pruned against the current catalog.
- Extend the preset browser.
  - Thumbnail rows with name, description, generator badge and star.
  - Favorites and Recent filters with counts and empty states.
  - Search composes with filters; matching stays accent-insensitive.
  - Accessible row/star markup, focus handling and thumbnail fallbacks.
- Extend `SPEC.md` §14 (Presets) and the architecture notes without changing
  the document format.
- Add unit/e2e coverage, visual review and documentation updates.

## Capabilities

### New Capabilities

- `preset-previews`: deterministic derived thumbnails, lazy generation, cache
  and invalidation, user-preset persistence and failure fallbacks.
- `preset-usage`: favorites, recents, ordering, persistence, pruning and
  deletion cleanup.
- `preset-browser`: visual rows, filters, search composition, empty/loading
  states and accessibility.

### Modified Capabilities

- None.

## Impact

- `src/presets/PresetManager.js` — usage metadata, preview cache, save/delete
  cleanup.
- `src/presets/preview.js` (new) — preview key and browser-only renderer.
- `src/presets/catalog.js` — special filter metadata if needed.
- `src/ui/widgets/PresetPanel.js`, `style.css` — thumbnails, stars, filters,
  empty/loading states.
- `src/application/App.js` — mark recents after a successful preset apply;
  inject the preview renderer.
- `test/lab.smoke.mjs` (new preset-library group), `e2e/presets.spec.js`.
- `README.md`, `docs/architecture.md`, `SPEC.md` §14.

No document v4, no preset JSON change, no network, no renderer change.

## Non-goals

- No stable preset-ID migration; names remain the storage key in this slice.
- No cloud sync, accounts, preset bundles or server-rendered thumbnails.
- No filled, shaded or ray-traced previews; previews use the existing
  wireframe compatibility curves, consistent with SVG export.
- No change to document v3, preset JSON, history or notebook serialization.
- No new render pass, Three.js, z-buffer or lighting model.
- No eager generation of all 40 previews at startup.
