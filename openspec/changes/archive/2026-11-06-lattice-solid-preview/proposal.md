## Why

The lattice preset showed only its authored strut network. Users had to trust
the Fabricate statistics and export the STL to see the real openwork body.
A solid preview closes that gap without changing the authored document.

## What Changes

- Add a `Preview` select to Fabricate: Network or Solid.
- Persist the choice as `view.fabrication.latticePreview`.
- When Solid is active and the lattice report is ready, inject the prepared
  mesh into the active scene layer.
- Simplify the display mesh when it is dense; export keeps the full source.
- Render the preview with a batched depth-banded pass.
- Fall back to the network during camera drags and playback.
- Keep the preview mode out of the fabrication job input key so toggling does
  not rebuild the solid.

## Capabilities

### New Capabilities

- `lattice-preview`: prepared-solid preview in the canvas.

## Impact

- Fabricate UI, scene builder, p5 adapter, render passes
- Fabrication settings sanitization
- Domain and e2e tests, docs

## Non-goals

- No change to the authored network or the exported mesh.
- No solid preview for non-lattice sources.
- No change to camera, fit or the render scene contract for normal layers.
