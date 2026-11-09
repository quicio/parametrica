## Contract

- Four panels: 3D, XY, XZ, YZ.
- Each panel uses its own projection transform but the same document.
- Artboard is divided into a 2x2 grid with gutters.
- SVG groups carry `data-panel="3d|xy|xz|yz"`.
- Plotter emits four panel groups in the same order.
- Overlays that cannot be vectorized are reported.

## Acceptance

- Quad SVG contains four panels with distinct projected geometry.
- Plotter output matches panel order.
- Single-view export is unchanged.
