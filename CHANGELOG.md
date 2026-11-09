# Changelog

All notable changes to Parametrica are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The version in
`package.json` is authoritative; see
[ADR-0001](./openspec/decisions/0001-code-versioning.md).

## [0.2.2] - 2026-11-09

### Added

- ADR-0003: spec-driven vertical delivery workflow.
- README, OpenSpec config and roadmap now point at the delivery policy.

### Changed

- The current working method is explicit: one vertical slice per OpenSpec
  change, validate before coding, test before archive, gates before release.

## [0.2.1] - 2026-11-09

### Added

- `PRODUCT.md` with confirmed users, purpose, positioning, constraints, brand
  commitments, evidence and product principles.
- `DESIGN.md` with the Swiss Instrument visual system: carbon palette, signal
  red, functional typography, flat elevation, zero-radius shapes and component
  rules.
- `.impeccable/design.json` sidecar for live component previews.
- ADR-0002: all UI/UX decisions pass through the Impeccable skill, with
  `PRODUCT.md` and `DESIGN.md` as durable authority.

### Changed

- Design work is now a gated process: context, scoped command, craft floor,
  rendered verification and detector.
- README and OpenSpec conventions point at the product/design authority.

## [0.2.0] - 2026-11-09

First tagged release after the v0.1.0 rewrite. This version covers the
post-lattice slices, the consolidated persistence layer, image even-odd fill,
Quad SVG/plotter export, preview evidence, UI hardening, the Fabricate object
library and the GitHub Pages deployment.

### Added

- Shared persistence repository with idempotent legacy-preset migration,
  backups, quota reporting and independent session/notebook/preset stores.
- Image even-odd fill and contour nesting for canvas, SVG and PNG.
- Quad layout export to SVG and plotter with four stable panels.
- Product preview quality degradation, hardware/SSAO benchmarks and Product
  PNG export.
- Dense-surface benchmark and overlay degradation during slow playback.
- UI hardening for 200% zoom, narrow viewports, keyboard navigation, focus,
  reduced motion and an accessibility-tree pass.
- Fabricate object primitives: rounded superellipse shells, cutter layers,
  open annular shells and stepped solids.
- Fabricate object waves: Pencil Cup, Planter, Bud Vase, Napkin Ring, Coaster,
  Twisted Totem, Lampshade, Candle Holder, Soap Dish, Desk Tray, Napkin Holder,
  Wall Planter, Wall Hook, Lampshade Ring Set and Stackable Tray.
- Independent boolean groups for multi-body presets and grouped 3MF output.
- GitHub Pages deployment workflow, live demo and deployment documentation.
- ADR-0001, this changelog and a version-consistency gate.
- Dynamic application version displayed in the masthead.

### Changed

- Fabricate is now a curated library of 24 exportable objects and technical
  solids. SDF Enneper and Möbius Challenge were removed from the category.
- CI runs the complete `npm run check` gate before Playwright.
- Product preview is available for every prepared solid, not only lattice and
  perforated bodies.
- The Fabricate report exposes grouped recipes, manufacturing checks and
  printability evidence.

### Fixed

- Product preview no longer shows “Build the solid preview” for ordinary solid
  presets.
- Storage quota failures keep the in-memory document, checkpoint or preset
  usable and surface the error.
- Corrupt storage data is preserved and backed up instead of being deleted.
- Cutter layers no longer render as authored geometry or appear in SVG.

## [0.1.0] - 2026-10-23

Initial Parametrica rewrite: parametric document model, generators, operators,
analysis, render passes, animation, mutation, presets, notebook, exploration,
image tracing, evolution, Helix Lab, Timeline export and the local-first
instrument UI.
