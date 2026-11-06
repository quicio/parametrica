## Why

Fabricate has many controls but no curated examples. Users must find a closed
model, set units and configure repair/boolean/SDF themselves. A Fabricate
category makes the mode discoverable and demonstrates each capability.

## What Changes

- Add the Fabricate preset category.
- Add example presets:
  - ready solid torus;
  - twin tori multi-body 3MF;
  - boolean union;
  - boolean difference;
  - cap repair Catenoid;
  - SDF Enneper;
  - non-orientable Möbius challenge.
- Pre-set millimetre scale and fabrication settings.
- Keep the challenge preset explicitly non-exportable so it demonstrates
  validation and next-action guidance.
- Add tests that every example evaluates and the intended ones export.

## Capabilities

### New Capabilities

- `fabricate-presets`: curated built-in Fabricate examples.

### Modified Capabilities

- `preset-previews`: the new category appears in the browser.

## Impact

- Built-in presets and catalog metadata
- E2E preset counts
- Tests/docs

## Non-goals

- No new geometry operator or document field.
- No automatic Fabricate mode switch.
- No new export format.
