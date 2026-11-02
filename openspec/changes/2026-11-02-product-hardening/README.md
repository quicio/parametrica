# Product hardening

Audit-driven, minimal hardening for the **current** Parametrica product.

Read in order:

1. `proposal.md` — findings, P0/P1/P2 classification, recommendations and the
   pending LOOK proposal.
2. `design.md` — technical approach for the mandatory hardening only.
3. `tasks.md` — P0 implementation checklist and verification.
4. `specs/ui-integrity/spec.md` — behavioural contract for the hardening.

Mandatory scope:

- layer-scoped analysis for per-layer diagnostic passes;
- truthful blend control;
- truthful layer lock;
- render-pass applicability;
- SVG export omission disclosure.

Documentation updates in README/SPEC are complementary, not a P0 defect.

Non-normative follow-ups: see the recommendation register in `proposal.md`.
The LOOK ownership grouping is a proposal pending validation, not a task in
this change.

Out of scope:

- MAKE, solids, CSG, STL/3MF;
- document v4;
- new renderer or 3D viewport;
- navigation rewrite or Notebook/Presets merge.
