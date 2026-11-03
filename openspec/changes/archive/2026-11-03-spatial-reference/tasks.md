## 1. Reference contract

- [x] 1.1 Add `view.reference` defaults, sanitization and document merging.
- [x] 1.2 Add pure origin/axes/ground geometry and extent resolution.
  - Verify: defaults, sanitization, extent capping, origin, axis visibility
    and ground division tests.

## 2. Scene integration

- [x] 2.1 Expose world bounds and reference transform in scene meta.
- [x] 2.2 Resolve scene/composition/world reference transforms.
  - Verify: reference origin matches the scene transform; toggling reference
    leaves frame and bbox unchanged; planar scenes have no transform.

## 3. Rendering and UI

- [x] 3.1 Draw axes, labels and optional ground in Canvas and Quad.
- [x] 3.2 Clip the reference to the artboard/panel and keep it out of captures.
- [x] 3.3 Add Canvas Reference and Ground toggles.
  - Verify: UI toggles, Quad panels, ground policy and export independence.

## 4. Docs and acceptance

- [x] 4.1 Document the reference contract, frame policies and limitations.
- [x] 4.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Reference is off by default and independently configurable.
- World origin, XYZ axes and labels are visible in spatial scenes.
- Ground is optional and low-density.
- Scene, composition and world modes use the correct transform.
- Quad shows axes in every panel and ground only in 3D/XY.
- Toggling reference never changes frame, bbox, geometry or export output.
- Reference is separate from CAD Guides.
- SVG, plotter, PNG and GIF never include the reference.
- UV Domain, CAD and physical units remain out of scope.


## Verification results

- `npm run check`: lint, **1752/1752** unit checks and production build pass.
- `npm run test:e2e`: **108/108** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit coverage: reference defaults/sanitization, extent capping, origin,
  axis visibility by projection, ground divisions, world transform alignment,
  frame/bbox independence, composition anchoring and planar exclusion.
- E2E coverage: Canvas toggles, ground enable/disable, document state, unchanged
  bbox/artboard rect and SVG without reference markup.
- Manual visual check: single Canvas and Quad 3D/XY panels show axes, labels and
  the optional ground grid; XZ/YZ show axes without the collapsing ground.
- Known limits: UI-only, no export opt-in, no numeric units, labels can be
  occluded by dense geometry and composition mode follows the active layer.
