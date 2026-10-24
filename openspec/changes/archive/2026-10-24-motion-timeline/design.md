## Decisions

### D1: Timeline model

```text
document.animation.timeline = {
  version: 1,
  duration: number,
  loop: boolean,
  tracks: [{ path, keyframes: [{ time, value, easing }] }]
}
```

Paths use the same ParameterRef paths as exploration. Numeric values are
clamped to schema. Selects/booleans may use step keyframes but are not
interpolated.

### D2: Resolution order

At evaluation time:

1. base parameter;
2. timeline keyframe value at `time`;
3. explicit `mods` expression, if present (documented precedence).

The existing `time` expressions remain supported. Keyframe lookup is
deterministic and does not mutate the document.

### D3: Easing

Linear, ease-in, ease-out, ease-in-out, step. Easing is a pure function of
normalized time between adjacent keyframes.

### D4: Recording

Recording a slider writes keyframes at the current playhead on mouse release;
a second recording replaces the track for that path after confirmation.

### D5: Export

Frame export evaluates at `fps × duration` times, captures the artboard canvas
PNG sequence, and writes a deterministic manifest. No video encoding in v1.

### D6: UI

Timeline panel below the canvas or as a drawer; transport, track list, selected
keyframe editor, loop toggle and export button.
