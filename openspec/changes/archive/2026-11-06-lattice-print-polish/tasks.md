## 1. Lattice quality

- [x] 1.1 Weight seeds by R² and run four Lloyd passes.
- [x] 1.2 Report cell area spread.
- [x] 1.3 Add rounded junction spheres as one union operand.
- [x] 1.4 Keep the micro-hole cap and orientation repair.

## 2. Perforated wall

- [x] 2.1 Read the exact R(z) from the outer Surface grid.
- [x] 2.2 Build radial cutters from the Voronoi seeds.
- [x] 2.3 Subtract cutters from the closed shell in one difference.
- [x] 2.4 Add `Perforated Vase 200` and catalog metadata.
- [x] 2.5 Reuse the solid preview with an Authored label.

## 3. Printability

- [x] 3.1 Add overhang, bed contact and minimum feature checks.
- [x] 3.2 Add the report field and Fabricate rows.
- [x] 3.3 Add cube, overhang and thin-feature tests.

## 4. Acceptance

- [x] 4.1 Node, domain, build and spec gates.
- [x] 4.2 E2E suite.
- [x] 4.3 Docs and counts.
- [x] 4.4 Archive the change.

## Acceptance criteria

- Cells are closer to a constant metric size.
- Three-way joints are rounded.
- `Perforated Vase 200` exports a valid cut shell.
- Every report shows overhang, bed contact and feature checks.
- Solid preview works for strut and perforated bodies.
