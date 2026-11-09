## Contract

`UI_SURFACE` lists every application member the UI may read or write.

- `createUiPort(app)` returns a proxy that:
  - binds methods to the app instance;
  - returns live properties;
  - allows writes only for listed mutable UI state (`exploreSeed`,
    `timelineRecorder`, `imageInput`, `imageUnderlay`);
  - throws on unknown reads or writes.
- Composition passes the port to `Controls`; panels keep using `controls.app`.

The port is deliberately broader than an ideal view model. It is the first
enforceable boundary; later slices can split it into render, fabrication,
notebook and document ports.

## Verification

- The architecture test scans `src/ui` for `app.<name>` and asserts the name is
  in `UI_SURFACE`.
- All e2e interaction tests must pass.
