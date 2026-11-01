## Context

The preset library already exposes categories, descriptions and accent-
insensitive search over 40 built-ins plus user presets
(`src/presets/catalog.js`, `src/presets/PresetManager.js`,
`src/ui/widgets/PresetPanel.js`). Preset documents are evaluated by the same
pure engine as the live document, and the existing `curvesDataURL` helper can
rasterize projected curves to a PNG data URL without touching p5 or the active
document. See `proposal.md` for motivation.

The library is name-keyed today: built-ins are keys of `BUILT_IN_PRESETS` and
user presets live under names in `parametrica.presets.v0`. This slice keeps
that contract.

## Goals / Non-Goals

**Goals:**

- Preview any preset without opening it, using only derived geometry.
- Keep preview generation off the live pipeline and off the first paint.
- Persist favorites and a short recent list across reloads.
- Keep preset JSON, document v3, history and notebook formats untouched.
- Make the browser usable with keyboard and screen readers.

**Non-Goals:**

- Stable preset IDs, renaming or cloud sync.
- Filled or shaded previews; previews stay wireframe, consistent with SVG.
- Generating all 40 previews eagerly at startup.
- A new renderer or a second p5 instance.

## Decisions

### D1: Preview profile and content

Previews are derived from the preset document, not from the current view.

```txt
PREVIEW_VERSION = 1
PREVIEW_SIZE = 96          // source pixels; displayed at 44 × 44 CSS px
background = '#050505'
stroke = '#e8e8e8'
strokeWeight = 1.25
time = 0
```

The document's own seed, camera, projection, operators and layers are used.
The active theme and active figure are ignored so the same preset always
looks the same and previews remain comparable.

Surfaces preview through their projected wireframe compatibility curves,
which is already how `evaluateDocument` exposes surfaces to `stroke` and SVG.
Filled previews would require a mesh rasterizer and are deferred.

Alternative rejected: use the live p5 canvas or an offscreen p5 instance.
That couples previews to the application renderer, the active artboard and
the frame loop.

### D2: Generation pipeline

```txt
preset document
  → evaluateDocument(document, { time: 0, bypassCache: true })
  → evaluation.curves
  → curvesDataURL(curves, { size: 96, bounds: evaluation.bbox, ...profile })
  → PNG data URL
```

`evaluateDocument` is pure with respect to the document, and `bypassCache`
keeps preview work out of the live stage caches. The evaluation object is
discarded after the data URL is produced. Errors or an empty curve list yield
`null`; the browser shows a placeholder.

The renderer is injected into `PresetManager` so the manager remains DOM-free
and unit-testable in Node:

```js
new PresetManager(storage, {
  renderPreview: (document) => renderPresetPreview(document),
});
```

In Node (or when no renderer is injected) preview generation is unavailable
and the browser uses placeholders. Tests inject a fake renderer.

Alternative rejected: pre-generate built-in PNGs at build time. It adds a
browser build step, goes stale when a preset factory changes, and still needs
a runtime path for user presets.

### D3: Preview key, cache and invalidation

```txt
previewKey(document) =
  sha256Hex(PREVIEW_VERSION + ':' + canonicalStringify(document))
```

`sha256Hex` and `canonicalStringify` already live in `src/lab/hash.js`.
The cache stores `{ hash, dataUrl }` per preset name.

- **Built-ins:** memory only. They are regenerated lazily each session; this
  keeps `localStorage` small and guarantees the preview matches the current
  factory output.
- **User presets:** memory plus persistence when the PNG is valid and
  `dataUrl.length <= PREVIEW_MAX_CHARS = 24_000`.
- **Invalidation:** hash mismatch, `PREVIEW_VERSION` bump, user-preset
  overwrite, preset deletion, or a catalog entry disappearing.
- **Bypass:** no preview is stored inside the preset document or its exported
  JSON.

A 96 px PNG of a line drawing is typically a few kilobytes; the cap protects
against pathological user figures.

### D4: Favorites

Favorites are a set of preset names in workspace metadata.

- `toggleFavorite(name)` returns the new state and does **not** apply the
  preset.
- Only known catalog names are accepted; unknown names are ignored.
- `favoriteEntries()` preserves catalog order (Curves → … → My Presets), not
  favorite time.
- Favorites are pruned on load and when a user preset is deleted.
- The star is a separate button from the apply button; its accessible label
  changes between “Favorite <name>” and “Unfavorite <name>”.

Alternative rejected: store favorites in the document. The document is the
form, while favorites are workspace UI state and must not travel with an
exported preset.

### D5: Recents

Recents are a recency-ordered list, not a set.

```txt
RECENT_LIMIT = 8
markUsed(name, at = Date.now())
  → remove any existing entry with the same name
  → unshift { name, at }
  → slice(0, RECENT_LIMIT)
```

- `App.applyPreset(name)` records the recent only after `adoptDocument`
  succeeds.
- Saving, importing, restoring a checkpoint, undo/redo and mutation do not
  record a recent.
- `recentEntries()` returns full catalog entries in recency order and skips
  names that no longer exist.
- The Recent filter is a flat list; category headers are suppressed so the
  order is genuinely recent-first.

### D6: Workspace metadata storage

```txt
key: parametrica.presets.meta.v1

{
  "version": 1,
  "favorites": ["Torus"],
  "recent": [{ "name": "Seashell", "at": 1760000000000 }],
  "previews": {
    "My Surface": { "hash": "…", "dataUrl": "data:image/png;base64,…" }
  }
}
```

Load rules:

- Ignore missing, malformed or non-object JSON and start empty.
- Keep favorites that resolve to a current preset; dedupe.
- Keep recent entries with a finite `at` and a known name; dedupe by name;
  sort descending by `at`; cap at 8.
- Keep user previews only when `dataUrl` starts with
  `data:image/png;base64,`, the hash is a string and the length is within the
  cap.
- Never keep built-in previews in storage.

Storage failures degrade to in-memory state and set `lastMetaError`; they
must not break preset apply/save/delete. The existing preset-document storage
key remains unchanged, so rollback is “remove the meta key”.

### D7: Browser composition

The Presets section keeps its search field and category chips, and gains two
special filters:

```txt
all | favorites | recent | <category id>
```

- Favorites is always visible with its count; Recent appears once it has at
  least one entry.
- Search matches names, descriptions, tags, generator ids and category ids,
  accent-insensitively, then composes with the active filter.
- The status line reports `n of total presets · <filter>`.
- The active preset is highlighted with `aria-current="true"` and the red
  left rule.
- Empty states explain how to populate the filter.

Row markup avoids nested buttons:

```html
<div class="preset-item" role="listitem">
  <button class="preset-apply" type="button" aria-current="true">
    <span class="preset-thumb" aria-hidden="true">…image or fallback…</span>
    <span class="preset-copy">name · badge · description</span>
  </button>
  <button class="preset-star" type="button"
          aria-label="Favorite Torus" aria-pressed="false">☆</button>
</div>
```

Thumbnails are 44 × 44 CSS px from a 96 × 96 source. The image is decorative
(`alt=""`) because the adjacent name carries the label.

### D8: Lazy preview loading

Previews are generated only for rows near the visible area of the preset
list:

- An `IntersectionObserver` with the list as root queues visible rows.
- At most `4` previews are generated per idle tick
  (`requestIdleCallback`, falling back to `setTimeout`).
- Cached previews are applied immediately when a row is rendered or rebuilt.
- A fixed-size monogram/category placeholder prevents layout shift while
  waiting.
- If generation returns `null`, the placeholder remains; no broken image is
  shown.

This keeps opening the section cheap even on low-end devices and avoids
evaluating 40 documents at once.

### D9: Focus and accessibility

- Apply and star are separate native buttons; tab order is apply → star.
- The star uses `aria-pressed`; the active row uses `aria-current`.
- Un-favoriting from the Favorites filter re-renders the list and moves focus
  to the next apply button, or to the Favorites chip if the list becomes
  empty.
- Deleting a user preset follows the same focus rule.
- The status line is an `aria-live="polite"` region.
- Category/filter chips are buttons with `aria-pressed` and a group label.
- Color is never the only state indicator.

## Risks / Trade-offs

- **`localStorage` quota** → cap persisted previews at 24 000 characters,
  snapshot only user presets, catch write failures and keep memory state.
- **Preview jank on low-end devices** → lazy intersection queue, idle ticks,
  4-per-tick budget, 96 px source.
- **Canvas raster differences across browsers** → spec requires visual
  equivalence, not byte-identical PNGs; the cache key is based on the
  document, not the raster.
- **Name-keyed metadata and renaming** → deletion prunes correctly; renaming
  is not supported in this slice. Stable IDs are a separate migration.
- **Stale preview after overwriting a user preset** → hash comparison plus
  explicit cache eviction in `save`.
- **Invalid nested button markup** → apply button and star button are
  siblings inside a row container.
- **Focus loss when un-favoriting** → explicit next-row/filter-chip fallback.
- **Surface previews are wireframe** → documented limitation; consistent with
  SVG export and the default stroke view.
- **Preview pipeline touching live caches** → `bypassCache: true` and discard
  the evaluation after rasterizing.

## Migration Plan

1. Ship the new opt-in meta key; existing preset documents and
   `parametrica.presets.v0` are untouched.
2. On first run, favorites/recents start empty; previews generate lazily.
3. If the meta key is corrupt or storage is unavailable, ignore it and run
   with session-only usage state.
4. Rollback: remove `parametrica.presets.meta.v1`. No document or preset
   migration is required.
