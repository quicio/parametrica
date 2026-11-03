## Context

Phase 3F reviewed 3A–3E as a system. Picking, inspection overlays, pin, UV
Domain and seams were spatially consistent. The only P1 reproducible bug was
the reference extent in perspective.

## Decisions

### D1: World-space reference extent

`referenceExtent` uses world width/height/depth. It caps deep shapes by the
horizontal world span and provides a floor for vertical shapes. Projected
artboard units and frame scale are not used.

### D2: No frame feedback

The extent is presentation only and never alters frame, bbox or geometry.

### D3: Integrated validation

Add e2e coverage for UV Domain + inspector + pin + seams + reference coexisting,
and for PNG/SVG export isolation. Keep existing lifecycle tests.

## Risks / Trade-offs

- No browser benchmark of seam build during dense playback.
- Seam overlay can rebuild on style/reference scene changes.
- Dense cells/seams remain visually small.
- Pin still releases on camera/projection changes.
