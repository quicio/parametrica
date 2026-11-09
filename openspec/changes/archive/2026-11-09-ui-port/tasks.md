## 1. UI port

- [x] 1.1 Add `UI_SURFACE` and `createUiPort`.
- [x] 1.2 Pass the port to `Controls`.
- [x] 1.3 Keep the existing panel API and behavior.
- [x] 1.4 Add the dynamic surface test.

## 2. Verification

- [x] 2.1 Run Node and e2e gates.
- [x] 2.2 Archive and release.

## Acceptance criteria

- UI code cannot read an application member outside `UI_SURFACE`.
- Composition creates the UI port.
- No panel behavior changes.
