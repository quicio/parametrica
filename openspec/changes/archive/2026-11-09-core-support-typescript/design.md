## Types

- `SchemaEntry`, `ParamSchema`, `SchemaType`, `Harmonic`.
- `StageDefinition`, `GeneratorDefinition`, `OperatorDefinition`,
  `RenderPassDefinition`, `Registry<T>`.
- `LayerLike`, `LayerSourceLike`, `GeneratorLike`, `DocumentWithLayers`,
  `InstanceCandidate`.
- `Capabilities`, `CapabilityDefinition`.
- `FillGradient`, `ResolvedFillGradient`, `GradientBBox`.

## Rules

- Registry validation and frozen definitions are unchanged.
- Stage callbacks are typed structurally at the registration boundary.
- Layer instance detection remains pure and rule-compatible.
- Schema/gradient output is unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Schema defaults, registry errors, layer rules and gradients behave unchanged.
