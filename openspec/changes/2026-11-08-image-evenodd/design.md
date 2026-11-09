## Contract

- Each traced contour keeps its `hole` flag and nesting parent.
- Fill uses `fill-rule="evenodd"` at the group level.
- Outer and hole contours remain separate editable layers.
- SVG and PNG agree on the filled result.
- Holes that touch the border are ignored by tracing as before.

## Acceptance

- A synthetic ring exports a filled ring with a transparent hole.
- Nested contours alternate fill/hole correctly.
- Layer count and Fourier editability are preserved.
