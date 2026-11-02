## Context

Phase 1 split LOOK into Camera, Canvas, Style, Render and Overlays and left
Image, Animation and Timeline in a temporary Work group. The components are
already self-contained:

- `ImagePanel` is instantiated by `Controls` and only needs the app.
- `TimelinePanel` and the Animation GUI read `app.document.animation`.
- Frame ZIP and GIF export already live inside `TimelinePanel`.
- `KEEP` already contains Notebook, Presets and Export.

The only layout coupling is the mode bar, currently a four-column CSS grid.

## Fit review

No blocking dependency conflict was found.

| Area | Finding | Response |
|---|---|---|
| Image | Section + `ImagePanel` are independent of LOOK | Move section to Ingest. |
| Animation | GUI reads `document.animation` | Move section to Perform. |
| Timeline | Owns keyframes and PNG/GIF export | Move section to Perform; export follows it. |
| KEEP | Already Notebook/Presets/Export | Leave unchanged. |
| Mode bar | CSS grid is fixed at four columns | Change to six columns; verify at 400 px panel width. |
| UI state | Section ids survive; old `look` mode is still valid | Preserve `look`; add migration for any `work` alias if found. |
| Tests | `openSection` already switches by section mode | Most flows continue; update LOOK-specific assertions. |

## Decisions

### D1: Six modes, existing LOOK decisions preserved

Mode order:

```txt
FORM · LOOK · EXPLORE · PERFORM · INGEST · KEEP
```

- **Form:** authoring/composition.
- **Look:** appearance and viewport.
- **Explore:** analysis and variation.
- **Perform:** Animation + Timeline + temporal export.
- **Ingest:** Image underlay/tracing.
- **Keep:** Notebook, Presets, Export.

`Look` stays in its existing position to preserve muscle memory. Perform and
Ingest are appended before Keep, matching the existing proposed option A.

### D2: Ownership

- Image → `ingest`.
- Animation + Timeline → `perform`.
- Frame ZIP and GIF export → Timeline in `perform`.
- Keep → workspace conservation and final artifact export (SVG/PNG/JSON).

No controls are duplicated between Perform and Keep.

### D3: LOOK becomes appearance/viewport only

LOOK contains Camera, Canvas, Style, Render and Overlays. It no longer renders
the Work group, Image, Animation or Timeline.

### D4: UI state migration

`parametrica.ui.v1` stores mode and section open state.

- Existing `form`, `look`, `explore` and `keep` modes remain valid.
- New `perform` and `ingest` modes are added to the valid set.
- A defensive `work → perform` mode alias is accepted for any pre-release
  state.
- Moved sections keep their ids (`image`, `animation`, `timeline`), so their
  open/closed state survives without rewriting.
- Existing `view`/`artboard` section aliases remain unchanged.
- Unknown modes still fall back to Form.

No document/preset/session migration is needed.

### D5: Keep vs Perform export boundary

Temporal artifacts belong to the timeline that produces them: frame ZIP and
GIF stay in Perform. Keep remains the final-artifact surface for SVG, PNG,
JSON and clipboard. This avoids duplicating the timeline controls in Keep.

## Risks / Trade-offs

- Six mode buttons are tight at the 400 px panel width; reduce label spacing
  and use six equal columns.
- Users accustomed to Work must discover Ingest/Perform; mode labels and the
  audit docs make the ownership explicit.
- Existing e2e helpers switch modes automatically, but LOOK-specific tests
  must assert the new absence/presence.
- Old stored UI state may point at `look` while the last open section was a
  moved tool; the section state remains, and the user reaches it from its new
  mode. No destructive rewrite is attempted.

## Open Questions

- None for this change. Further export/tracing/animation capabilities remain
  separate future work.
