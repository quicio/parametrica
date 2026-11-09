## Why

The UI panels receive `App` and reach into its document, stores, renderer and
commands directly. That makes the application class the implicit UI contract and
lets new dependencies appear without review.

## What Changes

- Add `composition/createUiPort.js` with an explicit `UI_SURFACE`.
- Pass the port to `Controls` instead of the App object.
- Keep the same methods and behavior; this is a transitional controller port,
  not the final view-model split.
- Add a test that scans every `app.*` use in `src/ui` and rejects names missing
  from the port.

## Out of Scope

- Replacing `app.document` reads with narrow view models.
- Typing the port (Phase C).
- Changing any panel behavior.
