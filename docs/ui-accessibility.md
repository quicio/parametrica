# UI accessibility and responsive review

**Date:** 2026-11-08
**Status:** reviewed

## Support policy

- Desktop is the primary product target.
- Tablet-width layouts are supported through the stacked stage.
- Phone-sized layouts remain usable but are not an official product target.

## 200% zoom review

CSS viewport `720×450`, equivalent to 200% zoom on a `1440×900` desktop.

| Browser | Page overflow | UI bottom | Canvas | Rail | Mode bar |
|---|---|---:|---:|---:|---:|
| Chromium | 720/720 | 450 | 202.5 px | 247.5 px | 36 px |
| Firefox | 720/720 | 450 | 202.5 px | 247.5 px | 36 px |
| WebKit | 720/720 | 450 | 202.5 px | 247.5 px | 36 px |

No horizontal overflow, no panel below the viewport, and the mode bar stays on
one line.

## Accessibility-tree pass

Chromium CDP `Accessibility.getFullAXTree` on the desktop layout reports:

- `tablist` named **Panel workspace**
- seven `tab` nodes: Form, Look, Explore, Perform, Ingest, Keep, Make
- exactly one selected tab
- one `tabpanel` named after the selected mode

The keyboard e2e suite covers roving arrow/Home/End focus, Enter/Space layer
selection, accessible layer action names, a white focus outline distinct from
the red active state, and reduced-motion durations.

## Residual manual check

A human VoiceOver/NVDA pass is still recommended before making a public WCAG
conformance claim. The automated pass verifies semantics, names and keyboard
behavior, not speech output quality.

## Verification

- `e2e/accessibility.spec.js`
- `e2e/panel.spec.js` 200% zoom test
- `docs/ui-accessibility.md` (this file)
