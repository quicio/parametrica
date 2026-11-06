## Context

Presets are complete Documents. `view.units` and `view.fabrication` already
persist, so an example can open with a physical scale and a fabrication recipe
without changing the document schema.

## Decisions

### D1: Category

Add a `fabricate` category with the label **Fabricate** and a hint describing
solids, repairs, booleans and multi-body examples.

### D2: Examples

| Preset | Demonstrates |
|---|---|
| Solid Torus | Closed solid, mm scale, 3MF output |
| Twin Tori | Disjoint bodies as two 3MF objects |
| Boolean Union | Manifold union of overlapping tori |
| Boolean Difference | Manifold difference with one result body |
| Cap Catenoid | Repair + automatic caps for an open surface |
| SDF Enneper | Self-intersection repair through Manifold SDF |
| Möbius Challenge | Non-orientable/open limits and next-action guidance |

### D3: Settings

Every example sets:

- `view.units` to mm with `mmPerWorldUnit = 10`;
- `view.fabrication` with format/quality and the relevant repair/boolean/SDF
  settings.

`Möbius Challenge` intentionally remains non-exportable and documents why.

### D4: Previews

Examples use the existing preset preview pipeline. No preview special-casing.

### D5: Tests

- Every example evaluates without errors.
- Ready examples report exportable and positive triangle counts.
- Twin Tori reports two bodies.
- Boolean Union uses Manifold and one body.
- SDF Enneper reports the SDF strategy.
- Möbius Challenge stays blocked with a reason.
- Preset browser counts update.
