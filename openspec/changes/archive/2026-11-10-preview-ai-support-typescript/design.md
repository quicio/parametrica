## Types

- Preview keys/options and unknown document input.
- `AdvisorCache<T>` with typed keys, values and size.
- `AdvisorPromptInput`, `AdvisorPrompt`, `AdvisorMessage`.
- Compact descriptor and document summary records.

## Rules

- Previews stay deterministic and bypass the evaluation cache.
- Cache keys keep document hash/version/provider/prompt version.
- Prompt payload fields and ordering are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Preview keys/thumbnails, cache eviction and prompt payloads are unchanged.
