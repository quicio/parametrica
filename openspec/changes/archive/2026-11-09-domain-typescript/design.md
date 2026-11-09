## Converted modules

| Module | Notes |
|---|---|
| `domain/units.ts` | units, validation, millimetre conversion |
| `domain/overlays.ts` | overlay id/label data |
| `domain/fabrication.ts` | cap strategies |
| `domain/scene.ts` | backend-neutral scene/layer contracts |
| `domain/passStyle.ts` | per-pass appearance policy |
| `domain/modeToggles.ts` | array-safe mode helpers |

## Import strategy

TypeScript sources use explicit `.ts` imports; Vite and `tsx` resolve them,
and `allowImportingTsExtensions` keeps `tsc` happy. Existing `.js` imports
continue through compatibility re-exports.

## Typing rules

- Unknown input at the boundary, then narrow into domain types.
- No new `any`.
- Strict null checks and unchecked indexed access remain enabled.
- `RenderLayer` keeps a small index signature for adapter metadata.

## Verification

- `tsc --noEmit` passes.
- Node and e2e suites pass.
- `dependency-cruiser` stays at zero violations.
