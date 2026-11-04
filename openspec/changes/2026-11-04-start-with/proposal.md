## Why

A fresh app opens the classic parametric document. Vortex Stack exists only as a
built-in preset, so a first-time user does not see it unless they navigate to
Keep → Presets → Compositions.

This is a discoverability problem, not a missing preset. Users need a first-run
choice and a way to start a new document from the same chooser.

## What Changes

- Add a **Start With** overlay when no valid session exists.
- Offer featured starting points:
  - Vortex Stack
  - Classic Parametric
  - Torus
- Apply the chosen document, save the session and close the overlay.
- Add a **New document** action that reopens the same overlay.
- Keep automatic session restore when a valid session exists.
- Make the overlay keyboard-accessible and non-blocking on preview failure.

## Capabilities

### New Capabilities

- `start-with`: first-run and new-document starting chooser.

### Modified Capabilities

- `session-recovery`: invalid/no-session startup shows the chooser instead of
  silently starting the classic document.

## Impact

- App startup/session wiring.
- A new full-canvas overlay and starting-card UI.
- Layers bar New document action.
- Preset previews may be reused for cards with stable fallback.
- Tests: unit for choice resolution, e2e for first run, session precedence and
  New document.

No geometry, operator, document version, export or Fabricate change.

## Non-goals

- No onboarding tour.
- No recent-documents browser.
- No “do not show again” setting.
- No automatic checkpoint before replacing a document.
- No new preset category or composition editor.
