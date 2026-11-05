## Why

Render passes can be enabled and mixed with opacity, but all stroke-bearing
passes inherit the layer stroke color and width. Users cannot distinguish two
diagnostic passes that need different visual weights.

## What Changes

- Add optional `view.passStyle[passId].color` and `.width`.
- Keep `view.passOpacity` as the opacity source.
- Apply overrides only to passes that support stroke color/width.
- Add per-pass controls in Render with a reset action.
- Include the resolved style in SVG/PNG exports.

## Capabilities

### New Capabilities

- `pass-appearance`: per-pass color/width overrides.

### Modified Capabilities

- `look-workspace`: Render pass appearance controls.

## Impact

- Document view defaults/sanitization
- Render pass context and stroke-bearing passes
- SVG recorder/render scene
- Render UI
- Unit/e2e tests
- No geometry, STL, camera or pass math change.

## Non-goals

- No per-layer pass settings.
- No gradients per pass.
- No fill styling per pass.
- No new render passes.
