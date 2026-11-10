## Types

- `ZipFile`, `ZipEntry`.
- `GifFrame`, `GifOptions` and a local `gifenc` module declaration.
- `BinaryStlResult`, STL geometry/validation adapters.
- `ThreeMfResult`, mesh/vector adapters and triangulation output.
- `FabricationValidation`, `ExportContext`, `GeometryExporter`.

## Rules

- Encoders stay DOM-free and deterministic.
- Geometry adapters are narrowed before indexing.
- Invalid, non-finite or degenerate inputs keep throwing the same errors.
- ZIP layout, XML ordering, palette sampling and scale resolution are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- STL/3MF/GIF/ZIP bytes and XML stay identical for existing fixtures.
