## 1. Usage metadata

- [x] 1.1 Add versioned workspace metadata (`parametrica.presets.meta.v1`)
      to `PresetManager`: load, sanitize, persist, tolerate malformed JSON and
      storage failures. Verify with `test/lab.smoke.mjs` group 31.
- [x] 1.2 Implement favorites: `toggleFavorite`, `isFavorite`,
      `favoriteEntries`, catalog ordering, unknown-name pruning. Verify with
      group 31.
- [x] 1.3 Implement recents: `markUsed`, `recentEntries`, dedupe,
      most-recent-first and the 8-entry cap. Verify with group 31.
- [x] 1.4 Record a recent only after `App.applyPreset` successfully adopts the
      preset; do not record save/import/restore/undo/mutation. Verify with
      `e2e/presets.spec.js`.
- [x] 1.5 Remove favorites, recents and previews when a user preset is
      deleted; evict previews when a preset is overwritten. Verify with group
      31 and `e2e/presets.spec.js`.

## 2. Preview pipeline

- [x] 2.1 Add `src/presets/preview.js` with `PREVIEW_VERSION`,
      `PREVIEW_SIZE`, `previewKey` (`sha256Hex` + `canonicalStringify`) and the
      fixed preview profile. Verify with group 31.
- [x] 2.2 Implement the browser renderer: evaluate the preset document at
      `time = 0` with `bypassCache`, rasterise `evaluation.curves` through
      `curvesDataURL`, and return `null` on error or empty curves. Verify with
      `e2e/presets.spec.js`.
- [x] 2.3 Inject the renderer into `PresetManager`, add the in-memory cache,
      persist user previews up to 24 000 characters, and never persist
      built-in previews. Verify with group 31.
- [x] 2.4 Invalidate on hash mismatch, profile-version bump, user-preset
      overwrite, deletion and catalog changes. Verify with group 31.

## 3. Browser UI

- [x] 3.1 Restructure rows into a non-nested apply button (thumbnail + name +
      description + generator badge) and a separate star button; add the
      44 × 44 thumbnail styles and placeholder. Verify with
      `e2e/presets.spec.js`.
- [x] 3.2 Add lazy preview generation with `IntersectionObserver`, an idle
      queue capped at four previews per tick, immediate cache application on
      rebuild, and a stable fallback placeholder. Verify with
      `e2e/presets.spec.js`.
- [x] 3.3 Add Favorites and Recent filters with counts, empty states and
      removal focus handling. Verify with `e2e/presets.spec.js`.
- [x] 3.4 Compose search with all filters; keep Recent flat and recency-
      ordered; keep Favorites grouped by catalog category. Verify with
      `e2e/presets.spec.js`.
- [x] 3.5 Add accessible names, `aria-pressed`, `aria-current`, a polite
      status region and keyboard tab order. Verify with `e2e/presets.spec.js`.

## 4. Verification and release gate

- [x] 4.1 Add the new unit group and update the documented check count, test
      count and preset-library counts in `README.md` and
      `docs/architecture.md`.
- [x] 4.2 Run `npm run check` and the full Playwright suite.
- [x] 4.3 Visually review previews for all 40 built-ins, including surfaces,
      and a saved user preset.
- [x] 4.4 Update `SPEC.md` §14, validate OpenSpec and archive the change after
      acceptance.

## Acceptance criteria

- Every preset has a deterministic, derived thumbnail; previews never mutate
  the active document, history, notebook or preset JSON.
- Previews are generated lazily, cached, and invalidated by document hash or
  profile version.
- Favorites and recents persist across reloads, are pruned against the
  catalog, and survive storage failures for the session.
- The browser exposes thumbnail rows, Favorites and Recent filters, accurate
  counts and explanatory empty states.
- Search composes with all filters and remains accent-insensitive.
- Apply, save, delete and import keep their existing behaviour.
- No document v4, no network request, no new renderer, no filled previews.

## Verification results

- `npm run check`: lint, **1549/1549** unit checks and production build pass.
- `npm run test:e2e`: **78/78** Playwright tests pass, including six preset
  library tests (browse/apply, previews, favorites, recents, unstar focus,
  delete focus).
- `openspec validate --changes --strict`: pass.
- Unit group 31 covers favorites/recents persistence, dedupe, the 8-entry
  cap, catalog order, unknown-name pruning, corrupt metadata, storage failure,
  preview-key stability, preview cache hits, user-preview persistence,
  overwrite eviction and deletion cleanup.
- Visual review confirmed thumbnails for the All, Surfaces, Favorites and My
  Presets views, including a saved user preset.
- Built-in previews are memory-only; user previews are persisted under
  `parametrica.presets.meta.v1` with a 24 000-character cap.
- Generated layer ids are excluded from the preview key, so identical preset
  content reuses the same preview across fresh document instances.

## Known limitations

- Presets remain name-keyed; renaming is not supported in this slice.
- Previews use the wireframe compatibility curves, not filled triangles.
- Recents are capped at 8 and are workspace-local.
- Preview generation is lazy and session-based for built-ins; there is no
  build-time thumbnail pipeline.
