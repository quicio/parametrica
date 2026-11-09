## Rules

| Rule | Forbids |
|---|---|
| `no-circular` | any import cycle |
| `domain-isolation` | domain → anything outside domain |
| `core-no-adapters` | core → UI/render/viz/application/composition/workers/export/presets/lab/interaction/input |
| `application-no-ui` | application → UI/composition/workers |
| `adapters-no-composition` | adapters → composition |
| `generators-no-render` | generators → render |
| `export-no-app` | export → `application/App.js` |

## Baseline

`.dependency-cruiser-known-violations.json` starts empty. The gate runs with
`--ignore-known`; adding a new violation fails. `--baseline` can only shrink or
format the file, never add debt silently.

## Verification

- `npm run arch:check` reports zero violations over 199 modules.
- `npm run check` includes typecheck and arch check.
