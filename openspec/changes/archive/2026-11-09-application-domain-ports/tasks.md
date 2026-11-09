## 1. Domain move

- [x] 1.1 Move look presets and applyUserLookToView.
- [x] 1.2 Move render scene contracts.
- [x] 1.3 Move ray and surface-picker math.
- [x] 1.4 Keep compatibility re-exports.
- [x] 1.5 Inject ProductPreview loading from composition.

## 2. UI ports

- [x] 2.1 Add FormPort.
- [x] 2.2 Add LookPort.
- [x] 2.3 Add KeepPort.
- [x] 2.4 Add IngestPort.
- [x] 2.5 Add AdvisorPort.
- [x] 2.6 Add StartWithPort.
- [x] 2.7 Shrink UI_SURFACE to Controls.

## 3. Gate

- [x] 3.1 Add application/render/interaction rules.
- [x] 3.2 Keep the baseline empty.
- [x] 3.3 Run Node, typecheck, arch and e2e gates.

## Acceptance criteria

- Application imports no render or interaction module.
- Every UI panel uses its own port.
- Dependency-cruiser reports zero violations.
- No behavior or output changes.
