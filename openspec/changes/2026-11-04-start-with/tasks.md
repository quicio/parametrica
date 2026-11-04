## 1. Overlay

- [ ] 1.1 Add the Start With modal with three featured cards and Cancel.
- [ ] 1.2 Add preview placeholders and keyboard/focus behavior.
- [ ] 1.3 Add first-run trigger when no valid session exists.

## 2. Actions

- [ ] 2.1 Add New document to the Layers bar.
- [ ] 2.2 Apply Vortex Stack, Classic Parametric and Torus choices.
- [ ] 2.3 Save the session after selection; keep current doc on Cancel.
  - Verify: unit choice tests, e2e first run, New document, cancel, preview
    fallback and accessibility.

## 3. Acceptance

- [ ] 3.1 Document the startup chooser and replacement behavior.
- [ ] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- A fresh app shows Vortex Stack, Classic Parametric and Torus.
- A valid session still restores automatically without the overlay.
- Choosing Vortex Stack loads the composition and saves the session.
- New document reopens the chooser; Cancel preserves the current document.
- Invalid sessions show the chooser instead of silently starting Classic.
- The overlay is keyboard-operable and preview failure is non-blocking.
