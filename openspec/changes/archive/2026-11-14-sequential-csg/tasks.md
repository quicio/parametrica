## 1. Model

- [x] 1.1 Add and sanitize `view.fabrication.recipe`.
- [x] 1.2 Build the ordered pipeline with intermediate validation.
- [x] 1.3 Give the recipe precedence over groups and the global boolean.

## 2. Product

- [x] 2.1 Add the `Sequential CSG` preset and catalog entry.
- [x] 2.2 Show the recipe in the plan and composition note.
- [x] 2.3 Cover sanitization, pipeline, determinism and failure.

## 3. Verification

- [x] 3.1 Run Node, build, typecheck, arch and e2e gates.
- [x] 3.2 Update docs and archive/release.

## Acceptance criteria

- A recipe can union and then subtract layers into one closed body.
- Every intermediate is validated; failures name the step.
- Existing groups and single-boolean presets are unchanged.
- The demo preset is exportable and deterministic.
- No CSG engine, unit or export-format change.
