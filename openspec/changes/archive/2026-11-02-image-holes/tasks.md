## 1. Hole detection

- [x] 1.1 Label inverted padded background and ignore border components.
- [x] 1.2 Trace internal holes with the existing component pipeline, mark
      `hole: true`, and report `holeCount`.
- [x] 1.3 Name hole layers and preserve the largest-contour default.
  - Verify: unit ring test finds one outer contour and one hole; multi-layer
    apply names the hole layer.

## 2. UI and docs

- [x] 2.1 Report holes in the Image status.
- [x] 2.2 Document the contour-only hole semantics.
- [x] 2.3 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- A ring traces one outer contour and one internal hole.
- Holes are editable Fourier layers with explicit names.
- Border background is not mistaken for a hole.
- Largest-contour default behavior is unchanged.
- No image data enters the document.
- Even-odd fill/nesting remains explicitly out of scope.


## Verification results

- `npm run check`: lint, **1682/1682** unit checks and production build pass.
- `npm run test:e2e`: **103/103** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit tests verify ring hole detection, border exclusion, `hole` metadata,
  named hole layers and unchanged largest-contour behavior.
- Hole contours are editable Fourier layers; even-odd fill remains out of scope.
