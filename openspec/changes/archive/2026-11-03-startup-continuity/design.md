## Context

`SessionStore` already debounces a sanitized document snapshot to localStorage.
The app loads it but does not apply it until the user clicks Restore. The
constructor evaluates a fresh default document before that choice.

The default style sets `stroke.width = 2` and `view.strokeWeight = 2`.

## Decisions

### D1: Restore before first evaluation

Load the session before history initialization and before the initial
`evaluate()`. Replace the fresh document with the sanitized snapshot so the
canvas, controls and telemetry all start from the restored state.

### D2: Full document continuity

The snapshot already contains generator, params, operators, layers, styles,
view, units, coordinates and animation time. Auto-restore applies all of it.
`animation.playing` remains false.

### D3: No blocking banner

Remove the Restore/Dismiss banner and pending-session pause. Show a transient
`Restored last session` notice after the UI is mounted. Corrupt snapshots or
storage errors fall back to the default document.

### D4: History baseline

Initialize the history baseline from the restored document, not the default
figure, so the first undo does not revert to an unrelated startup document.

### D5: Default stroke width

Change `DEFAULT_STYLE.stroke.width`, `view.strokeWeight` and exporter fallbacks
from 2 to 1. Existing documents and presets keep their stored widths.

## Risks / Trade-offs

- Users who want a blank start must choose a preset or generator manually.
- A stale session could surprise users; the notice makes restoration explicit.
- Removing the banner is a behavior change; tests and specs must be updated.

## Open Questions

- Should a future “New document” action clear the session?
