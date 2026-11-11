## Why

Image tracing is the last untyped input module, and `createApp`/`main` still
booted from JavaScript. Typing them closes the input layer and the browser
entry point.

## What Changes

- Convert `input/imageTrace.js` to `.ts` with typed image data, points,
  harmonics, thresholds, contours and results.
- Convert `composition/createApp.js` and `main.js` to `.ts`.
- Point `index.html` at `main.ts` and keep JS compatibility modules.
- Type the createApp options and App return boundary.
- Update architecture checks to read the typed entry/composition files.

## Out of Scope

- Generators, operators, geometry and UI.
- Changing tracing math, image limits, composition or boot behavior.
