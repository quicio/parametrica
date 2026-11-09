## 1. Composition

- [x] 1.1 Add `createApp` with services and adapter factories.
- [x] 1.2 Inject services and adapters into `App`.
- [x] 1.3 Boot `main.js` through `createApp`.
- [x] 1.4 Keep `App` methods and behavior unchanged.

## 2. Verification

- [x] 2.1 Extend the architecture boundary test.
- [x] 2.2 Run Node and e2e gates.
- [x] 2.3 Archive and release.

## Acceptance criteria

- `App` imports no concrete renderer, UI, exporter or store implementation.
- `createApp` creates every concrete adapter.
- The app boots and all existing tests pass.
