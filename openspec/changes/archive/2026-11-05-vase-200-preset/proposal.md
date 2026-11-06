## Why

The Fabricate examples need a real product-like object that demonstrates a
hollow shell, wall thickness and Boolean difference, not only abstract tori.

## What Changes

- Add `Solid Vase 200` to the Fabricate category.
- Use a radial profile of revolution with:
  - 200 mm height;
  - ~175 mm maximum diameter;
  - ~135 mm mouth;
  - 2.5 mm radial wall.
- Build outer and inner surfaces as two layers.
- Repair/cap both and subtract the inner solid with Manifold.
- Pre-set millimetre scale and STL output.

## Capabilities

### Modified Capabilities

- `fabricate-presets`: adds the hollow vase example.

## Impact

- Built-in presets/catalog
- Preset tests/docs/E2E counts

## Non-goals

- No lattice/openwork pattern yet.
- No image-to-3D inference.
- No new operator or document field.
