## Context

SurfacePickResult already contains world, face, barycentric, mapping status,
cell and UV. SurfaceMapping contains the cell faces. Scene layer transforms can
project world overlay points to artboard without touching RenderScene.

## Decisions

### D1: Derived overlay

`buildInspectionOverlay` derives marker/triangle/cell from the current
evaluation, scene and pick. It is not scene geometry and is never stored in
RenderScene. Missing/malformed mappings never produce a cell.

### D2: Drawing

P5Adapter draws the overlay after scene content, clipped to the artboard and
skipped in `captureMode`. Marker is screen-constant; triangle is white; valid
cell is Swiss-red. Invalid mapping uses a dashed/dim triangle and no cell.

### D3: Pin state

SurfaceInspector stores hover and pinned results separately. Pin freezes the
current valid result; hover continues updating in the background. Release
returns to hover.

### D4: Invalidation

Pinned results are validated against current layer/mesh/face, barycentric world
point, mapping status and UV/cell. The pin is released on evaluation/topology,
active-layer, camera, projection, frame, artboard, Quad and playback changes.
Canvas resize keeps the pin and reprojects the overlay.

### D5: Isolation

Overlays are UI-only, absent from SVG/plotter/PNG/GIF and do not alter frame,
bbox or geometry. No new spatial contract is introduced.

## Risks / Trade-offs

- Dense meshes make a cell visually tiny; marker remains visible.
- Pin releases on camera/projection changes for safety.
- Seams/twists are not visualized separately; that would need an explicit
  presentation convention.
- Single Canvas only.
