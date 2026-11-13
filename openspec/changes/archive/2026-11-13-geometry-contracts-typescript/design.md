## Types

- `Point2D`, `Point3D`, `Curve2D`, `Curve3D`, `Surface`, `Mesh`, `Solid`.
- `GeometryKind` literals and narrowing predicates.
- `mapGeometryPoints<P>` keeps structural fallbacks for legacy plain curves.

## Rules

- Factories keep the same fields, defaults and frozen kind table.
- Point mapping, clone semantics and trust clearing are unchanged.
