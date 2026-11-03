## Why

The initial Surface Inspection tests passed, but independent auditing found
integration and numerical edge cases: composition layers with independent
frames were compared as if their world rays were comparable, Quad state used
the declared layout rather than the renderer's actual state, small valid
triangles were rejected by an absolute determinant tolerance, malformed UVs
could be reported as valid, the inspector did not refresh on viewport changes,
and playback caused unnecessary DOM churn.

## What Changes

- Restrict composition-mode picking to the active layer.
- Use the renderer's actual `quadActive` state and notify the inspector on
  layout changes.
- Use relative determinant tolerance and accept any positive ray distance.
- Mark non-finite/malformed UV mappings as `mismatch`.
- Refresh inspection on viewport resize.
- Cache inspector messages to avoid repeated DOM replacement.
- Add independent audit tests and documentation.

## Capabilities

### Modified Capabilities

- `surface-inspection`: composition selection, actual Quad state, numerical
  tolerance, malformed mapping status and lifecycle refresh.

## Impact

- Modified: `src/interaction/ray.js`, `src/interaction/surfacePicker.js`,
  `src/ui/SurfaceInspector.js`, `src/application/App.js`,
  `src/render/p5/P5Adapter.js`, tests and docs.
- No new feature, geometry, RenderScene, frame, export or document format.

## Non-goals

- No Quad picking.
- No BVH.
- No transparency model.
- No editing or CAD.
