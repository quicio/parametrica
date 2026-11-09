## 1. Domain extraction

- [x] 1.1 Add `domain/units.js` and compatibility re-export.
- [x] 1.2 Add `domain/overlays.js` and compatibility re-export.
- [x] 1.3 Add `domain/passStyle.js` and compatibility re-export.
- [x] 1.4 Add `domain/fabrication.js` with cap strategies.
- [x] 1.5 Move manufacturing profile policy to `domain/manufacturingProfile.js`.

## 2. Import direction

- [x] 2.1 Update `core/document.js` to import domain modules.
- [x] 2.2 Update generators to import `view/camera.js`.
- [x] 2.3 Update inner/application imports to the domain paths.

## 3. Verification

- [x] 3.1 Add the architecture boundary test.
- [x] 3.2 Run Node and e2e gates.
- [x] 3.3 Archive and release.

## Acceptance criteria

- `core/document.js` has no imports from render, viz or geometry.
- Generators have no imports from render.
- Domain modules import no adapter or UI modules.
- All existing behavior and exports remain unchanged.
