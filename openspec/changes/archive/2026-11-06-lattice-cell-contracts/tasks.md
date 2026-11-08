## 1. Contract

- [x] 1.1 Define `LatticeSpec`, defaults, clamping, version and `algorithmVersion`.
- [x] 1.2 Define `LatticeNetwork`, node/edge/cell/opening/bands/stats.
- [x] 1.3 Define canonical serialization and `specHash`.
- [x] 1.4 Define node/edge/cell ID rules and the within-generation guarantee.

## 2. Distribution

- [x] 2.1 Compute lateral area and local target area.
- [x] 2.2 Sample seeds with density and irregularity.
- [x] 2.3 Implement power-diagram clipping and weights.
- [x] 2.4 Implement surface-area and area-centroid iterations.
- [x] 2.5 Flag boundary cells; compute interior CV.
- [x] 2.6 Support aspect and boundary modes.

## 3. Openings

- [x] 3.1 Inset cell polygons by strut/2.
- [x] 3.2 Estimate opening width; merge or report below minOpeningWidth.
- [x] 3.3 Expose opening polygons, widths and diagnostic areas.

## 4. Integration

- [x] 4.1 Make `surface-lattice` use the new builder.
- [x] 4.2 Cache by spec hash; avoid double work.
- [x] 4.3 Make Fabricate consume the same network.
- [x] 4.4 Make perforation consume the same seeds/cells.
- [x] 4.5 Migrate `Lattice Vase 200`; keep other presets stable.

## 5. Acceptance

- [x] 5.1 Unit tests for spec, power diagram, CV, openings, determinism, IDs.
- [x] 5.2 Regression for 15/20/25 mm and STL/3MF.
- [x] 5.3 E2E preview and Fabricate.
- [x] 5.4 Benchmark CV, target-size tolerance, time and memory on real presets.
- [x] 5.5 Document approximation limits, metrics and migration.
- [x] 5.6 Run full gates.

## Acceptance criteria

- Same spec + algorithmVersion produces the same network; seed/density behave
  as specified.
- Cells lie on the surface; power cells are convex; opening width is computed.
- Interior CV and target-size tolerance are measured and reported; numeric
  thresholds are provisional until benchmarked.
- Opening width target is enforced or reported; area is diagnostic.
- Preview, Fabricate and perforation share one network.
- Existing presets and exports do not regress.
