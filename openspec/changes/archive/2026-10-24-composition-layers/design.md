## Decisions

### D1: v3 shape

Reuse the `composition-model` contract: `version: 3`, `layers[]` with id,
name, visible, locked, seed, generator, operators and style; shared view,
artboard and animation. Migrate v2 by wrapping the existing stage in one layer.

### D2: Engine aggregation

Evaluate each layer independently, apply its operators, sanitize/budget each
layer, then concatenate curves in layer order with a `layerId` meta. A failing
layer records a keyed error and the others continue. Global budgets apply
across the composition.

### D3: Descriptor

Aggregate numeric fields across layers and expose `layers: LayerDescriptor[]`.
Symmetry/crossings use the combined curve set; area/perimeter/coverage sum.

### D4: UI

Layer panel with add/remove/duplicate, drag/reorder buttons, visibility,
lock, select. Generator/operator editors target the selected layer. Style
controls reuse `artboard-style` controls per layer.

### D5: Export

SVG contains one group per visible layer with its style; hidden layers are
omitted. PNG renders the composition. JSON is v3 with migration tests for
every built-in preset.

### D6: Backward compatibility

`sanitizeDocument` accepts v2 and v3; all built-ins and user presets load.
Round-trip tests compare geometry before/after migration.
