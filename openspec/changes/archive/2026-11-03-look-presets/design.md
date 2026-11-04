## Context

Render passes currently use a native checkbox plus an always-visible opacity
range. The range's large red thumb reads as a switch. `buildRenderSection`
also removes inapplicable passes from `view.modes`, so changing generator
silently forgets a configured pass.

Pass applicability already exists through `appliesTo` and
`renderPassApplies`. Canvas already gates Camera projection/layout by spatial
capability, but surface-only toggles and Coordinates remain visible and
clickable on 2D layers.

## Decisions

### D1: Named visual presets

Add a pure `lookPresets.js` contract:

```text
{
  id, name, description,
  requires: null | 'surface' | 'fourier' | 'closed',
  modes, overlays, colorMetric, guides
}
```

Presets:

| Preset | Modes | Overlays | Color metric |
|---|---|---|---|
| Line | stroke | none | auto |
| Technical | stroke, points, tangents, normals | inflections, sample points, ruler, bbox | auto |
| Surface | stroke, surface wireframe, surface fill | none | auto |
| Gradient | gradient wireframe | none | height |
| Diagnostic | stroke, curvature, topology | inflections, bbox | curvature |
| Field | signed distance | none | auto |

Applying a preset writes only `view.modes`, `view.overlays`,
`view.colorMetric` and `view.guides`. It never writes geometry, style, units,
camera or fabrication state.

### D2: Preset availability

- Surface requires at least one visible Mesh.
- Fourier requires the active generator `fourier` with harmonics.
- Closed requires at least one closed curve.
- Line, Technical, Gradient, Diagnostic and Field are always available.

Unavailable presets stay visible but disabled with a short reason. The user can
see that the visualization exists without being told it silently failed.

### D3: One primary control per pass

The pass checkbox is the only on/off control. Opacity is a labeled secondary
range:

```text
[✓] Stroke                    OPACITY [====] 100%
    Primary curve stroke.
```

- Opacity is disabled when the pass is off or inapplicable.
- The percentage label updates live.
- Unavailable passes show `N/A` and a reason below the name.
- Pass order and grouping remain unchanged.

### D4: Preserve configuration

`view.modes` is the user's configuration, not the currently drawable subset.
An inapplicable pass remains in the array and is skipped by the renderer,
which already handles empty geometry. Re-enabling the required geometry
restores the visualization without re-adding passes.

### D5: Applicability is visible

- Surface-only Canvas toggles (UV Domain, Inspect, Seams) are disabled with a
  reason when the active layer has no surface/mesh.
- Coordinates controls are disabled with a reason when the active layer has no
  spatial transform.
- Existing Pass `appliesTo` remains the source of truth; the UI adds copy, not
  new capability rules.

### D6: Reset

Reset applies the Line preset and clears diagnostic overlays. It does not
reset camera, artboard, style or document presets.

## Risks / Trade-offs

- Presets can overwrite the current visual configuration; the action is
  explicit and undoable through history.
- Keeping inapplicable modes means a saved document can contain passes that
  are not currently drawable; exports must continue to omit them safely.
- More explanatory copy increases panel height; reasons stay one line and only
  appear for unavailable controls.

## Open Questions

- Should presets also set stroke/fill style, or remain view-only? This change
  keeps them view-only.
- Should users be able to save custom visual presets later?
- Should the N/A group collapse by default on small panels?
