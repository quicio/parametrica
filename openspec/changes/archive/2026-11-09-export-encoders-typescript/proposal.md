## Why

The ZIP, GIF, STL and 3MF encoders carry the byte-level output contract for
timeline, fabrication and report exports. They were the last untyped pure
modules under `src/export`, and `geometryExport` is the shared validation
contract they and the application depend on.

## What Changes

- Convert `export/zip.js` to `.ts` with typed entries and byte buffers.
- Convert `export/gif.js` to `.ts` with typed frames/options and a local
  `gifenc` declaration.
- Convert `export/stl.js` to `.ts` with typed geometry, validation and result.
- Convert `export/3mf.js` to `.ts` with typed meshes, triangulation and result.
- Convert `export/geometryExport.js` to `.ts` with a typed validation contract.
- Keep the JS compatibility re-exports and the readable `.ts` imports inside
  `src`.

## Out of Scope

- `Exporter.js`, `svgContext.js`, `App.js`.
- Changing archive layout, byte order, timestamps, triangulation or units.
