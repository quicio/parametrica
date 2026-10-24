# orthographic-projection Specification

## Purpose
Orthographic projections of 3D curves — the Alzado/Planta/Perfil views of
the reference design. The document keeps full 3D points; the projection is
applied at render time based on `view.projection`, so switching views never
re-evaluates the geometry.
## Requirements
### Requirement: Projection selector

`view.projection` SHALL be a select with values `'3d' | 'xy' | 'xz' | 'yz'`,
defaulting to `'3d'`. Old documents (no `view.projection`) MUST sanitize to
`'3d'`.

#### Scenario: Default view

- **WHEN** a document has no `view.projection`
- **THEN** the renderer shows the 3D camera view (`'3d'`)

#### Scenario: Switch to a projection

- **WHEN** `view.projection` changes to `'xy'`, `'xz'`, or `'yz'`
- **THEN** the canvas renders the orthographic projection without
  re-evaluating the document

### Requirement: Projection definitions

Each projection SHALL map 3D points to 2D screen coordinates, discarding the
axis perpendicular to the plane:

- `xy` (Planta, top-down): keep x, y; drop z.
- `xz` (Alzado, side): keep x, z; drop y.
- `yz` (Perfil, front): keep y, z; drop x.

#### Scenario: XY projection

- **WHEN** `view.projection = 'xy'`
- **THEN** a helix renders as its annulus (ring) shape, radius constant in
  the radial-modulation case `a=0`

#### Scenario: XZ projection

- **WHEN** `view.projection = 'xz'`
- **THEN** a helix renders as its vertical wave profile (sinusoid-like)

#### Scenario: YZ projection

- **WHEN** `view.projection = 'yz'`
- **THEN** a helix renders as its vertical wave profile from the front

### Requirement: Consistent fit behavior

Projected curves SHALL fit to the canvas with the same fit semantics as the 3D
view (fit size applies to the projected bounding box).

#### Scenario: Fit applies per projection

- **WHEN** the user changes `fit` while a projection is active
- **THEN** the projected curve scales to the new fit size

### Requirement: Camera drag disabled in projection mode

In `'xy' | 'xz' | 'yz'` there is no camera to rotate; the canvas drag
handler MUST NOT change yaw/pitch while a projection is active.

#### Scenario: Drag in projection mode

- **WHEN** `view.projection ≠ '3d'` and the user drags the canvas
- **THEN** yaw/pitch do not change (the drag does nothing)
