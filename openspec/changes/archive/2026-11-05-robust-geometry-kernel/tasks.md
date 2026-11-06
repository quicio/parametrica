## 1. Predicates

- [x] 1.1 Add exact double-to-integer conversion.
- [x] 1.2 Add fast/adaptive orient2d sign.
- [x] 1.3 Add fast/adaptive orient3d sign.
- [x] 1.4 Add adaptive tolerance and snap rounding.

## 2. Primitives

- [x] 2.1 Add robust 2D segment intersection.
- [x] 2.2 Add robust point-in-triangle.
- [x] 2.3 Add triangle-triangle classifier and segment extraction.

## 3. Integration

- [x] 3.1 Use exact signs in self-intersection classification.
- [x] 3.2 Use exact 2D signs in repair ear clipping.
- [x] 3.3 Expose adaptive tolerance for CSG/remesh callers.
- [x] 3.4 Keep existing behavior and tests green.

## 4. Tests and acceptance

- [x] 4.1 Fast/exact/collinear/near-degenerate predicate tests.
- [x] 4.2 Snap, segment, point-in-triangle and triangle-triangle tests.
- [x] 4.3 Determinism and input immutability.
- [x] 4.4 Run full gates, document the kernel and archive.

## Acceptance criteria

- Orientation signs are exact for finite doubles.
- Tolerance is scale-aware and recorded.
- 2D and triangle primitives are robust and deterministic.
- Existing self-intersection, repair and CSG tests remain green.
- No dependency, DOM or renderer coupling.
