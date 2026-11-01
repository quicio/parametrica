## 1. Panel shell

- [x] 1.1 Add Form/Look/Explore/Keep mode bar with persisted state.
- [x] 1.2 Convert section headers to accessible accordions; default Generator and Parameters open.
- [x] 1.3 Add sticky context status (layer, generator, operators, mods, tracks, projection).
- [x] 1.4 Add hidden-layer warning with Show action.

## 2. Progressive parameters

- [x] 2.1 Classify technical generator params as advanced.
- [x] 2.2 Render a persisted Advanced disclosure; fall back to direct render when all params are advanced.
- [x] 2.3 Preserve lil-gui bindings, docs and refresh paths.

## 3. Projection safety
- [x] 3.1 Disable orthographic views for 2D generators and fall back to the camera view.
- [x] 3.2 Reset stale projections when switching to a 2D document.
- [x] 3.3 Keep the Grid Repeat / Clone ×3 path intact and expose it as a quick operator action.

## 4. Tests/docs

- [x] 4.1 Add e2e helpers for modes/sections; update existing suites.
- [x] 4.2 Add panel-clarity e2e coverage (modes, accordion persistence, advanced state, hidden layer, projection gating, Clone ×3).
- [x] 4.3 Update README/SPEC/architecture.
- [x] 4.4 Full lint/test/build/e2e; validate/archive.

## Verification results

- `npm run lint`: **0 errors**.
- `npm test`: **1157/1157 checks**.
- `npm run test:e2e`: **62/62 tests**, including panel modes, accordion persistence, advanced parameters, hidden layer warning, 2D projection fallback and Clone ×3.
- `npm run build`: succeeds without chunk warnings.
- `openspec validate --changes`: valid.
