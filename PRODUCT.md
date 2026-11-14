# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Parametrica is for a **mixed design-and-fabrication user**: designers, artists
and makers who explore mathematical families in the browser and then carry the
same form toward a physical output. They are comfortable with parameters,
expressions and technical readouts, but they do not want a CAD sketcher or a
vector-illustration tool.

Typical situations:

- exploring a curve, surface or lattice before deciding what the piece is;
- comparing variations, saving checkpoints and returning to a previous state;
- preparing a validated body for STL/3MF, a plotter drawing or a presentation
  image;
- teaching or demonstrating how an equation becomes a continuous form.

## Product Purpose

Parametrica is a **parametric geometry workbench**: type or tune mathematics,
see the form update, stack operators, mutate a family, animate it and export it.
The document is the form. The mathematical model is the authoring surface.

Success means the user can move from an equation to a reproducible document and
then to a faithful visual or fabricated output without leaving the instrument.

## Positioning

Parametrica deliberately holds three claims at once:

1. **Equation-first authoring.** There is no pen tool, anchor editing or
   freehand drawing. Mathematics is the only authoring surface.
2. **Fabrication as a first-class outcome.** Validated STL/3MF, Manifold CSG,
   lattice/perforated bodies, grouped multi-body recipes and manufacturing
   evidence are part of the product, not an afterthought.
3. **A deterministic visual laboratory.** Layered documents, notebook
   checkpoints, evolution, previews and exports are reproducible from the same
   JSON and seed.

A neighboring product can copy one of those claims, but not the combination
without changing its authoring model.

## Operating Context

- Browser-only. No backend, accounts, cloud sync or telemetry leaving the
  machine.
- Local storage for session, notebook and presets; explicit import/export is the
  share format.
- The technical canvas is the primary workspace. Fabricate is a separate mode
  that reads the prepared solid without editing canonical geometry.
- Outputs include SVG, plotter SVG, PNG, Product PNG, GIF, frame ZIPs, binary
  STL, 3MF and JSON.
- Physical units are explicit. Unitless is the default; millimetres are opt-in
  and geometry is never silently rescaled.
- The live demo is static and hosted on GitHub Pages.

## Capabilities and Constraints

- 25 registered generators, 37 operators, 15 render passes and 65 built-in
  presets.
- Document v3 supports multiple layers, instance layers, layer styles and
  per-layer render modes.
- p5 is the technical renderer and the source of truth for overlays, picking,
  SVG/plotter and canonical exports. WebGL/PBR is optional presentation only and
  lazy-loaded.
- Fabricate uses Manifold CSG with BSP/remesh fallbacks. A body must validate as
  closed before STL/3MF is allowed.
- The Fabricate category is curated: every entry is exportable. Technical torus
  and boolean examples may require supports; functional/decorative objects must
  have bed contact and stay below the overhang warning.
- Wall thickness is estimated from sampled surface rays and labelled
  `estimated`; external slicer verification remains a manual record, not an
  automated claim.
- The document, notebook and presets have separate persistence responsibilities
  with idempotent migration and backup.
- Existing v1 `glyph-lab` documents/presets remain readable; writes emit
  `parametrica`.

## Brand Commitments

- Name: **Parametrica**.
- Tagline: *A form is not drawn. A form is parameterized.*
- Doctrine: *A form is not drawn · A form is parameterized.*
- Swiss-modernist, dark, technical instrument identity. The interface should
  feel precise and operational, not decorative or illustrative.
- Red is a signal, not a surface. The identity is black/carbon with restrained
  neutral text and a single Swiss red accent.
- Functional typography and compact, legible controls take priority over
  expressive display type.
- The app is an instrument, not a gallery: the canvas and the mathematical
  readout lead.

## Evidence on Hand

- `README.md`: product overview, live URL and feature surface.
- `SPEC.md`: canonical product/engine contract and historical milestones.
- `openspec/specs/`: archived behavioral specs.
- `docs/`: implementation notes, benchmarks, fabrication evidence and
  accessibility review.
- `e2e/` and `test/`: executable evidence for UI, export and fabrication
  contracts.
- Live deployment: https://quicio.github.io/parametrica/
- No customer testimonials, commercial benchmarks, pricing or third-party
  endorsements exist. Future work must not invent them.

## Product Principles

1. **The equation is the interface.** Every new surface should make the
   mathematical model easier to see, tune or compare.
2. **The document is the artifact.** Determinism, round-trip fidelity and
   shareable JSON outrank visual effects.
3. **Local-first by default.** No account, backend or network dependency may
   become required for the core workflow.
4. **Fabrication is evidence-led.** A pretty preview never substitutes for a
   validated closed body, units and explicit checks.
5. **Technical legibility over ornament.** Dense, readable instrumentation is
   the aesthetic; decoration must earn its place.

## Accessibility & Inclusion

- Keyboard access to modes, layers and layer actions.
- Visible focus distinct from the active state.
- Reduced-motion handling.
- No horizontal overflow at 200% zoom; the stage stacks below 900px.
- Functional text at 11px or larger where the interface allows; AA contrast.
- Screen-reader semantics for tablist/tabpanel and layer actions.
- A human VoiceOver/NVDA pass is still recommended before making a formal WCAG
  conformance claim.
