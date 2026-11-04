# Startup continuity and default style

## Last session restore

Parametrica stores a debounced local session snapshot and restores it
automatically on startup. The restored state includes:

- generator and parameters
- operators
- layers and visibility
- styles, artboard and view settings
- units and coordinates
- look passes and overlays
- animation time, never playback

The restore happens before history initialization and the first evaluation, so
the first canvas paint is already the last used document. A short non-blocking
notice reports `Restored last session`.

If no valid snapshot exists, the default document is used. Corrupt snapshots or
storage failures fall back safely and never block startup.

The explicit Restore/Dismiss banner is gone. To start a different figure, load a
preset or change the generator; that becomes the next saved session.

## Default stroke width

New documents use a stroke width of `1`:

- `view.style.stroke.width = 1`
- legacy `view.strokeWeight = 1`
- exporter fallbacks use `1`

Existing documents and presets keep their stored width.
