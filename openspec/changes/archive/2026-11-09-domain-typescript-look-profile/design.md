## Converted modules

- `domain/lookPresets.ts`: preset data, availability, resolution, matching and
  user-look application.
- `domain/manufacturingProfile.ts`: process presets, sanitization, check
  construction and report assembly.

## Types

- `LookPreset`, `LookContext`, `LookView`, `UserLook`.
- `ManufacturingProcess`, `ManufacturingProfile`, `ManufacturingCheck`,
  `ManufacturingReport`.
- Unknown input remains `unknown` until sanitized.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- No report values or look behavior change.
