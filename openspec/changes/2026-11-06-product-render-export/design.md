## Context

- `ProductPreview.capture()` already renders the current scene and returns a PNG
  data URL.
- `Exporter` already has `downloadDataURL` and a timestamp helper.
- Fabricate already knows whether Product preview is active and whether the body
  is exportable.
- The technical PNG export must remain unchanged.

## Contract

```text
Exporter.exportProductPreviewPNG({ filename? } = {})
  -> dataUrl | null
```

Rules:

- If Product preview is not active, return `null` and notify the user.
- Capture only the WebGL canvas; do not include the masthead, panel or overlays.
- Use the current material, light rig, shadows and AO.
- Filename: `parametrica-product-<timestamp>.png` or a sanitized document name.
- The action is hidden or disabled when Technical preview is active.
- No geometry or fabrication state is mutated.

## Acceptance classification

**Functional guarantees**

- The action exists only in Product preview.
- The PNG is a valid non-empty image.
- The existing technical PNG, STL, 3MF, SVG and plotter exports are unchanged.
- A failure is reported, not silent.

**Quality objectives (provisional)**

- Capture cost is acceptable for the current preview resolution.
- The image matches the visible canvas.

**Pending decisions**

- Transparent background export.
- Named document prefix and collision policy.
- Automated visual comparison of the captured PNG.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Capture differs from visible canvas | Medium | Render immediately before capture |
| Huge PNG on high DPR | Low | Existing renderer size; document limit later |
| Product preview not active | Low | Disable action and notify |
| Export implies printability | Medium | Label as presentation, not a print proof |
