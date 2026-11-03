## 1. Integration

- [x] 1.1 Restrict composition picking to the active layer.
- [x] 1.2 Use actual renderer Quad state and notify layout changes.
- [x] 1.3 Refresh inspection on viewport changes.
- [x] 1.4 Cache inspector messages.

## 2. Numerical and mapping robustness

- [x] 2.1 Use relative triangle determinant tolerance and positive t.
- [x] 2.2 Mark malformed/non-finite UVs as mismatch.
- [x] 2.3 Add tiny-triangle, edge/vertex, inverted, malformed mapping and
      composition tests.

## 3. Validation

- [x] 3.1 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.
- [x] 3.2 Document findings, fixes, performance and residual limits.

## Acceptance criteria

- Composition never compares independent-frame world distances.
- Actual Quad state controls the inspector message.
- Tiny valid triangles and close positive hits are accepted.
- Malformed UVs never appear as valid.
- Viewport changes refresh the inspector.
- Existing render, frame, bbox and exports remain unchanged.
- No new features or Quad picking.


## Verification results

- `npm run check`: lint, **1885/1885** unit checks and production build pass.
- `npm run test:e2e`: **111/111** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Added regression coverage for composition active-layer selection, actual Quad
  state, tiny/close triangle hits, malformed UV mappings, viewport lifecycle,
  inspector preference persistence and order-independent occlusion.
- Manual visual checks: Torus inspector in single Canvas and `Single view only`
  in Quad.
