## Why

The solid vase validates the fabrication pipeline, but the reference object is
an openwork cellular vessel. Users need a way to explore cells and struts
without hand-authoring mesh geometry.

## What Changes

- Add a `surface-lattice` generator:
  - samples a periodic Voronoi diagram on a surface of revolution;
  - uses a nominal cylinder metric so cells are roughly millimetre-sized;
  - relaxes the seeds twice to remove slivers;
  - emits one world `curve3d` per cell edge.
- Add a lattice solid builder:
  - sweeps each curve into a closed tube at the requested strut diameter;
  - adds a solid floor and a rim ring;
  - unions everything with Manifold;
  - caps microscopic boundary loops left by float32 junctions.
- Add `Lattice Vase 200` to the Fabricate category:
  - 200 mm tall, 20 mm cells, 3.5 mm struts, 4 mm rim, 3 mm floor;
  - Z-up and exportable as STL.
- Add a `lattice` fabrication flag so the job runs in the worker.
- Show lattice stats in the Fabricate checks.

## Capabilities

### New Capabilities

- `surface-lattice`: cellular strut network generation and solidification.

### Modified Capabilities

- `fabricate-presets`: the solid vase stays solid; the lattice is a separate
  example.

## Impact

- New generator, network module and solid builder
- Fabrication source selection, worker heuristic and UI checks
- New built-in preset and catalog metadata
- Tests, docs and preset counts

## Non-goals

- No general mesh import or arbitrary-surface lattice yet.
- No hidden cutter layers or changes to the layer schema.
- No change to the solid vase, repair, booleans or export contracts.
