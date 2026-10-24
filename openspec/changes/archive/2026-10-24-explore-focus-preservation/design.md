## Context

`explore-1d` implemented candidate generation and adoption through
`App.adoptDocument`, which always calls `controls.rebuildAll()`. That reset
the inspector DOM, scroll and focus. The user reported the panel jumping up
after randomizing/adopting.

## Decisions

### D1: Parameter-only adoption mutates in place

If the candidate generator id and operator ids/order match the current
document, `adoptCandidate`:

1. clones/sanitizes the candidate;
2. merges `seed`, generator params/mods and operator params/mods into the
   existing objects;
3. calls `rebuild()` (history + evaluation);
4. calls `Controls.refreshValues()` to update lil-gui displays, expression
   fields and axis labels.

The candidate strip stays alive. Structural differences still use
`adoptDocument` and a full rebuild.

### D2: Full rebuild context restoration

`Controls.build()` captures:

- `#ui.scrollTop`;
- the active element's `data-focus-id`.

After rebuilding it restores scroll immediately and across two animation
frames, and focuses the tagged target with `preventScroll`. A short timeout
corrects browsers that scroll a focused element on the next layout task.
Tagged controls: Explore axis/steps/generate/randomize/intensity, Analyze,
Notebook name/save/compare/export/import.

### D3: Strip position

`ExplorePanel.renderCandidates()` captures `stripEl.scrollLeft` and
`controls.container.scrollTop` before replacing the strip and restores both
after rendering.

### D4: Test

The e2e regression scrolls to Explore, randomizes, asserts scroll delta < 8 px
and focus on Randomize, then adopts a candidate and asserts the strip remains,
scroll is stable and focus stays on the candidate.

## Risks

- In-place merge assumes the candidate has the same schema; sanitization and
  structure checks enforce that.
- Focus tagging is opt-in; untagged controls fall back to body focus, but
  scroll still restores.
