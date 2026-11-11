## Types

- `LatticeParams`, `LatticeCell`, `LatticeEdge`, `LatticeNetwork`.
- Cached networks are typed; openings and projections are narrowed.

## Rules

- Lattice spec, cache keys, network math and projection are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Lattice geometry is unchanged.
