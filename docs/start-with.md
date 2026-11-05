# Start With and New document

## First run

When Parametrica starts without a valid local session, it shows a **Start With**
modal instead of silently opening the classic figure.

Starting cards:

- **Composition** — featured instance-layer study using Vortex Stack as the
  starting example.
- **Parametric** — the original two-equation 2D line.
- **Parametric Surface** — the U/V surface generator.

Cards use the existing preset preview pipeline; a failed preview falls back to a
stable placeholder without blocking selection.

## Session precedence

- A valid session restores automatically; Start With is not shown.
- A missing or invalid session shows Start With.
- Choosing a card applies that document, closes the modal and saves the session
  immediately.

## New document

The Layers bar includes **+ NEW DOCUMENT**, which reopens the same chooser over
the current figure.

- **Cancel** keeps the current document.
- Choosing a card replaces it through the normal document adoption and history
  path.
- No automatic preset or notebook checkpoint is created.

## Keyboard

- Focus starts on the featured Composition card.
- Tab stays inside the modal.
- Enter/Space selects.
- Escape cancels on a manual New document, or starts Parametric on first
  run.
