## Types

- `Rec`, `PointLike`, `GeneratorContext`.
- `apply(items: unknown[], params: Rec, ctx?)` at the operator boundary.
- Expression results are narrowed through `evaluatePointExpression`.

## Rules

- Numeric params are coerced as before (or 0/1 fallbacks).
- Transform math and IDs are unchanged.
