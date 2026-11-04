## Context

The Vortex Stack was validated manually with a helical Surface source and five
instance layers. The built-in preset library currently assumes a document's
active generator is available through `document.generator`, which is null for an
instance layer.

Preview hashing also strips layer ids but not `source.layerId`, so repeated
built-in composition factories can produce different hashes.

## Decisions

### D1: Preset document

`Vortex Stack` is a complete v3 document:

- name: `Vortex Stack`
- source: `parametric-surface`, name `Vortex Source`
- source params:
  - `exprX = '(1.2 + 0.25*cos(v))*cos(u)'`
  - `exprY = '(1.2 + 0.25*cos(v))*sin(u)'`
  - `exprZ = '0.65*u + 0.18*sin(v)'`
  - `u0 = 0`, `u1 = 4*PI`
  - `v0 = 0`, `v1 = 2*PI`
  - `closedU = false`, `closedV = true`
  - `samplesU = 80`, `samplesV = 12`
  - `fit = 420`
- source layer hidden
- five instance layers with `translate`, `rotate`, `scale`
- active layer: first instance
- view: 3D, `modes: ['stroke']`, camera yaw `-0.6`, pitch `0.34`,
  guides off, diagnostic overlays off
- default unitless units and coordinates off

Instance parameters:

| # | Δz | Rotate ° | Scale | Stroke opacity |
|---|---:|---:|---:|---:|
| 1 | -1.8 | 0 | 1.00 | 1.00 |
| 2 | -0.9 | 36 | 0.92 | 0.85 |
| 3 | 0.0 | 72 | 0.84 | 0.70 |
| 4 | 0.9 | 108 | 0.76 | 0.55 |
| 5 | 1.8 | 144 | 0.68 | 0.40 |

Each instance uses stroke width 1.

### D2: Factory

A new built-in factory creates the source via `createDocument`, sets the source
params/visibility, appends five layers via `createInstanceLayer`, sets the
active layer and view, and returns the document. No sanitization is required
beyond the constructors, but the document must load without errors.

### D3: Category

Add `compositions` after `surfaces`:

```text
{ id: 'compositions', label: 'Compositions', hint: 'Layered and instanced forms' }
```

`Vortex Stack` metadata:

- category: `compositions`
- description: `A helical Surface instanced into a five-layer vortex.`
- tags: `['composition', 'instance', 'surface', 'vortex', 'helix']`

### D4: Generator badge

Built-in entries resolve their generator badge from:

1. `document.generator?.id`, then
2. the first layer with `layer.generator?.id`, then
3. `'unknown'`.

This avoids `unknown` for instance-active compositions and keeps existing
presets unchanged.

### D5: Preview hash

`previewDocument` normalizes layer identity before hashing:

- map each layer id to its stable index;
- replace `source.layerId` with the index of the referenced layer;
- keep the rest of the document intact.

This makes repeated factories hash identically even though ids increment.
Bump `PREVIEW_VERSION` to 3 to invalidate older cached previews.

### D6: Preview rendering

Composition previews use the existing `evaluateDocument` + wireframe thumbnail
path. Five hidden-source instances must produce curves and a PNG preview. No
special renderer is added.

## Risks / Trade-offs

- Built-in factory ids are not stable, but preview hashing normalizes them.
- The composition is open (`closedU = false`) and is not fabricable.
- Five instances add evaluation cost to preview generation; still bounded.
- A new category increases the preset browser list.
- The preset must not be editable as a built-in; users can duplicate/save it.

## Open Questions

None blocking.
