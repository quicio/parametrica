# Instance performance

## Benchmark

`npm run bench:instances` builds one 64×32 `parametric-surface` source and 24
instance layers with translate/rotate/scale, then measures:

- cold evaluation (`bypassCache`);
- first warm evaluation;
- cached evaluation;
- curve and point counts;
- whether cached geometry is reused.

Reference result on 2025-era development hardware (Node):

```text
instances: 24
layers: 25
errors: 0
curves: 2400
points: 102400
coldMs: ~192
warmMs: ~104
cachedMs: ~2.4
cachedGeometryReused: true
```

## Budgets

- cold evaluation target: < 500 ms;
- cached evaluation target: < 50 ms;
- regression > 25% on the same machine should be investigated;
- 24 instances must render without evaluation errors or budget clipping;
- instanced rendering remains a separate future change.

The browser e2e smoke uses a looser envelope (`cold < 1500 ms`,
`cached < 500 ms`) to avoid CI noise. The Node benchmark records the real
numbers.
