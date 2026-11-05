## Context

Startup currently restores a valid session automatically. When no session exists
it evaluates the default parametric document. Presets, including Vortex Stack,
are only reachable through Keep → Presets.

`SessionStore.load()` already distinguishes a missing/invalid session from a
valid one. The app has a modal/dialog service and preset preview pipeline.

## Decisions

### D1: When the overlay appears

- Valid session → restore it automatically; no overlay.
- No session or invalid session → show **Start With** before the user starts
  working.
- New document action → show the overlay over the current document, with Cancel.

The overlay is not persisted as a preference. Once a choice is made, the saved
session prevents it from appearing automatically again.

### D2: Starting cards

```text
Composition        featured · instance layers · Vortex Stack example
Parametric         2D equations
Parametric Surface 3D U/V equations
```

Cards represent **modes/families**, not individual shapes. `Torus` is an example
inside Parametric Surface, not a starting mode.

All three cards are equal-width squares with the same preview height. The
featured card is distinguished by border and kicker, not by size. Cards show
name, one-line description, scope and a preview/placeholder. Previews are
derived from existing preview rendering and never block selection.

### D3: Choice semantics

- `Composition` applies the Vortex Stack built-in composition.
- `Parametric` creates the default `parametric` document.
- `Parametric Surface` creates the default `parametric-surface` document.
- `Cancel` on a manual New document keeps the current document.
- `Escape`/Cancel on first run selects Classic Parametric, because there is no
  current document to preserve.

Selection closes the overlay, focuses the canvas or panel, and saves the session
immediately.

### D4: New document action

A `NEW` action appears in the Layers bar alongside Add Layer and Add Instance.
It opens the same overlay. The current document remains underneath and is
replaced only after a card is chosen.

No automatic checkpoint is created. The action is explicit, Cancel is available,
and the replacement flows through the existing undo/history path.

### D5: Session priority

If a valid session exists, it always wins at boot. The Start With overlay is only
automatic when no valid session exists. Invalid sessions are treated as no
session and show the chooser.

### D6: Accessibility

The overlay is a modal dialog:

- focus moves to the featured card;
- Tab is trapped inside;
- Enter/Space activates;
- Escape follows D3;
- background interaction is blocked;
- cards and preview placeholders have accessible labels.

### D7: Failure

If a chosen preset fails to instantiate, keep the overlay open, show an error and
do not replace the current document. Classic Parametric remains available as a
fallback.

## Risks / Trade-offs

- First-run users see a choice instead of an immediate canvas; this is the
  intended discoverability trade-off.
- Replacing a document from New document can discard the current session; Cancel
  and undo are the safeguards.
- Preview generation adds startup work; placeholders keep it non-blocking.
- Three cards may grow later; keep the initial set fixed.

## Open Questions

- Should New document also appear in the global header later?
- Should the chooser remember the last used card without skipping the overlay?
