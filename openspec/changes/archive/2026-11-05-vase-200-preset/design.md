## Context

The reference is a vase of revolution with a solid wall. Parametrica can model
the outer and inner profiles as two `parametric-surface` layers and use Manifold
difference to make the shell.

## Decisions

### D1: Profile

Normalized `v ∈ [0, 1]`, `z = 200v`:

```text
R(v) = 45
     + 42.5 · exp(-((v - 0.42)/0.22)²)
     + 22.5 · exp(-((v - 1.00)/0.12)²)
     - 12.0 · exp(-((v - 0.75)/0.14)²)
```

This gives a ~92 mm base, ~175 mm belly, ~75 mm neck and ~137 mm mouth.

### D2: Shell

- Outer layer: `R(v)`, `z = 200v`.
- Inner layer: `R(v) - 2.5`, `z = 3 + 207v` so the inner solid extends above the
  rim and removes the top cap.
- Repair/cap both surfaces.
- Boolean difference: outer − inner.
- Bottom floor is 3 mm; wall is 2.5 mm radial.

### D3: Fabrication settings

- units: mm, `mmPerWorldUnit = 1`;
- scope composition;
- boolean difference;
- CSG strategy manifold;
- repair/cap enabled;
- STL output.

## Test matrix

- Preset evaluates with no errors.
- Exportable body; ~200 mm tall; width 170–180 mm.
- Positive triangles/volume.
- Boolean strategy manifold.
