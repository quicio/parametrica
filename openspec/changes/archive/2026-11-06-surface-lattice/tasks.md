## 1. Network

- [x] 1.1 Add the periodic Voronoi network on a surface of revolution.
- [x] 1.2 Area-weight the seeds and add two Lloyd passes.
- [x] 1.3 Filter sliver edges and emit world curve3d geometry.
- [x] 1.4 Add the `surface-lattice` generator and parameters.

## 2. Fabrication

- [x] 2.1 Sweep curves into closed tubes.
- [x] 2.2 Add the floor and rim.
- [x] 2.3 Union through Manifold and cap microscopic loops.
- [x] 2.4 Route the job through the heavy worker.
- [x] 2.5 Show lattice stats in the Fabricate checks.

## 3. Preset and acceptance

- [x] 3.1 Add `Lattice Vase 200` and catalog metadata.
- [x] 3.2 Add network, solid and preset tests.
- [x] 3.3 Update preset counts and docs.
- [x] 3.4 Run node, build, spec and e2e gates.
- [x] 3.5 Archive the change.

## Acceptance criteria

- The network is deterministic, sits on the vase surface and spans floor to
  mouth.
- Fabricate produces one closed lattice body and exports it as STL.
- `Solid Vase 200` and `Lattice Vase 200` remain separate examples.
