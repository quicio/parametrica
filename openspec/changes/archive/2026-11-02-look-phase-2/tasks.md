## 1. Modes and ownership

- [x] 1.1 Add `perform` and `ingest` to the mode list and mode bar; preserve
      Form/Look/Explore/Keep order with Perform/Ingest before Keep.
- [x] 1.2 Move `Image` to `mode: 'ingest'`.
- [x] 1.3 Move `Animation` and `Timeline` to `mode: 'perform'`.
- [x] 1.4 Remove the Work group label and its unused group-element machinery.
  - Verify: `e2e/look.spec.js` asserts the new modes and absent Work label.

## 2. Layout

- [x] 2.1 Change the mode bar to six equal columns and verify the labels fit
      at the panel width.
  - Verify: e2e mode switch and visual canvas smoke.

## 3. UI state migration

- [x] 3.1 Preserve valid `form`/`look`/`explore`/`keep` modes, add
      `perform`/`ingest`, and accept a defensive `work → perform` alias.
- [x] 3.2 Keep moved section open/closed state; preserve `view`/`artboard`
      aliases.
  - Verify: e2e state-migration test with `look`, `work`, `image`, `animation`
    and `timeline` state.

## 4. Tests and regression

- [x] 4.1 Update LOOK e2e: no Work group; Image only in Ingest; Animation and
      Timeline only in Perform; Keep unchanged.
- [x] 4.2 Update any section/mode assumptions in existing e2e flows.
  - Verify: full `npm run test:e2e` and `npm run check`.

## 5. Documentation and acceptance

- [x] 5.1 Update the navigation audit, README, SPEC.md and architecture notes.
- [x] 5.2 Run strict OpenSpec validation and archive the change.

## Acceptance criteria

- The inspector exposes Form, Look, Explore, Perform, Ingest and Keep.
- Image is in Ingest and is absent from Look.
- Animation and Timeline are in Perform and are absent from Look.
- Frame ZIP and GIF export remain in Timeline in Perform, without duplicates
  in Keep.
- Look contains only Camera, Canvas, Style, Render and Overlays.
- The Work group label is gone.
- Existing UI state remains valid; old `view`/`artboard` section aliases and a
  defensive `work → perform` mode alias are honored.
- No document/preset/session format changes.
- No new tracing, animation or export capability.


## Verification results

- `npm run check`: lint, **1633/1633** unit checks and production build pass.
- `npm run test:e2e`: **96/96** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- `e2e/look.spec.js` covers the six modes, LOOK without Work, Ingest owning
  Image, Perform owning Animation/Timeline and Keep remaining unchanged.
- Legacy `work` mode and moved-section open state migrate to Perform/Ingest.
- No document, preset, notebook or session format changed.
