# Parametrica — Arquitectura para lattice orgánico

**Estado:** propuesta de arquitectura y diseño técnico, previa a implementación.
**Base auditada:** commit `35fda6d` + auditoría `docs/audit-geometric-evolution.md`.
**Alcance:** Fase 1 (distribución celular y contratos) y Fase 2 (struts
orgánicos, intersecciones y acabado escultórico).

> **Nota de alcance.** El brief original termina en “Control…” dentro de la
> lista de parámetros de Fase 1. Esta propuesta asume que los puntos faltantes
> son: control de densidad, control de curvatura, control de grosor, control de
> aperturas y control de fabricación. Deben confirmarse antes de archivar las
> especificaciones.

Este documento no implementa código. Define contratos, algoritmos, límites,
criterios de aceptación y riesgos para que las dos fases puedan especificarse y
revisarse sin reabrir la arquitectura en cada iteración.

---

# 0. Notas de esta revisión

Esta versión corrige las propuestas previas sin cambiar el alcance de las dos
fases. Los cambios principales son:

| Punto | Corrección |
|---|---|
| Métrica | `X = θ·R_ref` se documenta como **desenrollado aproximado**, no como Voronoi geodésico. El área sí se mide sobre la superficie; las distancias no. |
| Openings | El criterio pasa de **área** a **ancho libre mínimo** (`minOpeningWidth`). El área queda como diagnóstico. La red estima; el sólido final valida con un gauge. |
| Curvas | Catmull-Rom se interpola en **(θ,z)/(u,v)**, no en 3D arbitrario; se manejan seam, continuidad angular y tolerancia de superficie. |
| Joints | Se define región local, solape, integración, preservación de openings, fallback y garantía de manifold. El método SDF queda como **candidato a benchmark**, no como implementación cerrada. |
| Parámetros | `targetSize` se define como pitch característico; `minOpeningWidth` es ancho; IDs sólo estables dentro de una generación/spec; `algorithmVersion` entra en el hash. |
| Calidad | Se separa la calidad de reparación/SDF existente de la calidad de acabado. El campo de acabado queda como decisión pendiente, no como supuesto. |
| Alcance | Fase 1 no incluye radios, joints, curvatura ni calidad de acabado; Fase 2 los consume sin redefinir la distribución. |
| Criterios | Se clasifican en garantía funcional, objetivo de calidad, benchmark pendiente y valor provisional. |

> El brief recibido termina en “Control…”. Se asume control de densidad,
> curvatura, grosor, aperturas y fabricación. Confirmar antes de archivar.

## 0.1 Estado de implementación

Implementado en esta rama:

- `LatticeSpec` normalizado, `algorithmVersion`, `specHash` y `networkHash`.
- Power diagram con área objetivo sobre la superficie, Lloyd, densidad,
  irregularidad, aspecto y boundary.
- Openings por ancho libre, centros de apertura y gauge posterior sobre el
  sólido final.
- Fabricate consume la misma red y la misma especificación; Preview sólo
  cambia la visualización.
- Curvas orgánicas Catmull-Rom centrípetas en `(θ,z)`, con unwrap de seam y
  radio por muestra; fallback explícito a polyline si falta el perfil.
- Radio constante o taper; sección circular con radio por anillo.
- Joints technical/rounded; `blend` solicitado cae a `rounded` y se reporta
  como fallback (sin benchmark SDF todavía).
- Envolvente `centerline`/`outer` y perfiles de acabado separados de la
  calidad de reparación/SDF.
- `Organic Lattice Vase 200` y controles Finish en Fabricate.

Pendiente de benchmark o revisión humana:

- SDF local + `Manifold.levelSet` frente a `rounded`.
- Muestreo adaptativo por desviación de cuerda y G1 explícito en cadenas.
- Radio por expresión.
- Medición formal de 15/20/25 mm, memoria y tiempos.
- Revisión visual de screenshots del preset orgánico.

# 1. Punto de partida verificado

La auditoría previa y una nueva lectura del código confirman:

- El lattice actual vive en `src/generators/surfaceLattice.js`,
  `src/geometry/latticeNetwork.js` y `src/geometry/latticeSolid.js`.
- La red es un **Voronoi periódico** sobre una superficie de revolución,
  calculado en un cilindro desenrollado con radio nominal `meanRadius`.
- Los seeds se aceptan con probabilidad proporcional a `R(z)²` y se relajan con
  **4 pasadas de Lloyd**.
- El sólido son **tubos de radio constante** con tapas planas, más **esferas
  low-poly** en vértices de grado ≥ 3, piso cilíndrico y borde toroidal, unidos
  con Manifold.
- El preset real `Lattice Vase 200` tiene 220 celdas, 638 aristas, 373 joints,
  121 142 triángulos y 119.55 cm³; altura 199.89 mm.
- La uniformidad es dependiente de la seed: CV de área **0.357** en el preset,
  **0.257** en el escenario de test con otra seed/top. No hay contrato de
  tamaño de celda.
- El documento sólo guarda parámetros; la red, el sólido y el preview son
  **geometría derivada**.
- Fabricate reconstruye el sólido desde las curvas evaluadas; no hay una
  `LatticeSpec` explícita ni una fuente única compartida entre preview,
  fabricación y perforación.
- El renderer es p5 2D; no hay PBR. La Fase 2 es geometría, no apariencia.

**Decisión de base:** no se reemplaza la arquitectura actual. Se extrae un
contrato de lattice derivado, se conserva el documento y se mantiene Manifold
como motor exacto.

---

## 1.1 Afirmaciones verificadas contra el código

| Afirmación | Evidencia |
|---|---|
| El generador actual es `surface-lattice` con `profile`, `height`, `floor`, `cellSize`, `strut`, `rim`, `seed`, `samples`. | `src/generators/surfaceLattice.js` |
| La red usa Voronoi periódico, seeds ponderados por R² y 4 pasadas de Lloyd. | `src/geometry/latticeNetwork.js` (`buildRevolveLattice`, `voronoiCells`, `seedWeight`) |
| El sólido usa tubos de radio constante, esferas low-poly, piso, rim y unión Manifold. | `src/geometry/latticeSolid.js` (`buildLatticeSolid`, `tubeMesh`, `jointSpheresMesh`) |
| `minOpeningWidth` no existe hoy; el generador sólo tiene `strut`. | `src/generators/surfaceLattice.js`, `src/presets/builtins.js` |
| `view.fabrication.quality` existe, pero la UI lo usa para `remeshResolution` de reparación/SDF, no para el acabado lattice. | `src/core/document.js`, `src/ui/sections/fabricateSections.js`, `src/ui/Controls.js` |
| `buildLatticeCandidate` usa `radialSegments: 8` fijo y no recibe un perfil de acabado. | `src/application/fabricationSource.js` |
| El worker recibe `preparation` serializada; `isHeavyFabrication` incluye lattice. | `src/application/fabricationJobs.js`, `fabricationJobRunner.js`, `src/workers/fabricationWorker.js` |
| El preview lattice se excluye de la clave de fabricación; cambiar preview no relanza el worker. | `src/ui/Controls.js` (`refreshFabricate`, `prepKey`) |
| `manifoldGuaranteed` hace que `validateMesh` omita auto-intersecciones. | `src/geometry/manifoldEngine.js`, `src/geometry/validate.js` |
| `3MF` escribe `face[0..2]` sin triangular. | `src/export/3mf.js` |
| El renderer es p5 2D; no hay WebGL/PBR. | `src/render/p5/P5Adapter.js`, `package.json` |

# 2. Principios de diseño

1. **Documento ≠ geometría derivada.** El documento conserva parámetros,
   capas y vista. La red celular, los struts, los joints y el sólido son
   derivados reproducibles.
2. **Una sola fuente de verdad.** Preview, Fabricate y perforación deben
   consumir la misma `LatticeNetwork`; no se recalcula una versión distinta en
   cada consumidor.
3. **Métrica antes que estética.** La distribución debe respetar el área real
   de la superficie y el tamaño objetivo; la organicidad se controla, no se
   deja al ruido.
4. **Aperturas primero.** El tamaño de celda no es suficiente: hay que
   preservar la apertura libre después de descontar el strut.
5. **Derivados con procedencia.** Todo Mesh derivado declara spec, seed,
   calidad, validación y estadísticas.
6. **Sin dependencias nuevas.** Catmull-Rom, power diagrams y SDF local se
   implementan con la infraestructura existente; no se agrega Three.js ni un
   kernel externo para geometría.
7. **Calidad de acabado incremental (Fase 2).** `draft`, `standard` y `high` son
   presupuestos explícitos; no se promete el acabado máximo en todos los
   perfiles. Fase 1 no introduce perfiles de acabado.
8. **Identidad paramétrica.** El lattice sigue siendo una familia matemática
   controlada por parámetros, no un editor de malla libre.

---

# 3. Fase 1 — Distribución celular y contratos

## 3.1 Objetivo

Conseguir una red celular **orgánica controlada**, estable y medible, y definir
los contratos que la Fase 2 necesita (nodos, aristas, celdas, aperturas,
procedencia). No se implementa todavía el acabado de struts.

## 3.2 Contrato `LatticeSpec`

`LatticeSpec` es una representación **serializable y normalizada** de los
parámetros del lattice. No contiene funciones ni objetos de UI. Se deriva de los
parámetros del generador; no se agrega al documento en esta fase.

```text
LatticeSpec {
  version: 1
  algorithmVersion: 1
  surface: {
    kind: 'revolution'
    profile: string          // R(v), v ∈ [0,1]
    height: number           // mm / world units
    zMin: number
    zMax: number
  }
  cell: {
    targetSize: number       // pitch característico en mm (no apertura)
    density: number          // 0.25..4, multiplicador local
    densityMode: 'uniform' | 'expression'
    densityExpression: string | null
    irregularity: number     // 0..1
    relaxation: number       // 0..12
    aspect: number           // 1 = isotrópico; >1 alarga en v
    boundaryMode: 'flag' | 'clip' | 'pad'
    seed: number
  }
  clearance: {
    strutDiameter: number
    minOpeningWidth: number  // ancho libre mínimo, mm
  }
  budget: {
    maxCells: number
    maxEdges: number
  }
}
```

Reglas:

- Campos desconocidos se ignoran; valores fuera de rango se claman.
- `version` permite migraciones futuras.
- `densityExpression` se evalúa con el mismo parser seguro del proyecto; si
  falla, se usa `density` uniforme y se reporta.
- `targetSize` es el **pitch característico** de la celda (centro a centro),
  no el tamaño de la apertura. El target de área es `targetSize²` como
  aproximación de primer orden; la aceptación mide el diámetro equivalente
  `2·sqrt(area/π)`. Para el jarrón, 1 unidad = 1 mm.
- `minOpeningWidth` es el **ancho libre mínimo** entre bordes de la apertura, no
  un área. `strutDiameter` participa del inset; no de la red de centerlines.
- `algorithmVersion` entra en el hash y en la identidad de IDs.

## 3.3 Contrato `LatticeNetwork`

`LatticeNetwork` es el resultado puro y determinista de `buildLatticeNetwork(spec)`.
No se serializa en el documento; se comparte por caché.

```text
LatticeNetwork {
  specHash: string
  algorithmVersion: number
  spec: LatticeSpec
  nodes: LatticeNode[]
  edges: LatticeEdge[]
  cells: LatticeCell[]
  bands: {
    floor: LatticeBand
    rim: LatticeBand
  }
  stats: LatticeStats
}

LatticeNode {
  id: string
  u: number          // θ normalizado o ángulo
  v: number          // z / height
  x, y, z: number    // world
  degree: number
  boundary: boolean
}

LatticeEdge {
  id: string
  a: string          // node id
  b: string          // node id
  length: number
  samples: Vec3[]    // centroline, no tubo
  cellIds: string[]
}

LatticeCell {
  id: string
  nodeIds: string[]
  polygon: Vec2[]        // (s,z) o (θ,z) en el dominio de la superficie
  surfaceArea: number
  targetArea: number
  openingPolygon: Vec2[] // polygon insetado por strut/2
  openingWidth: number   // ancho libre estimado (mm)
  openingArea: number    // diagnóstico, no criterio de fabricación
  boundary: boolean
  mergedInto: string | null
}

LatticeBand {
  zMin: number
  zMax: number
  cellIds: string[]
}

LatticeStats {
  cellCount: number
  interiorCellCount: number
  boundaryCellCount: number
  edgeCount: number
  nodeCount: number
  meanCellArea: number
  cellAreaCv: number      // sólo celdas interiores
  minOpeningWidth: number
  maxOpeningWidth: number
  meanOpeningWidth: number
  openingsBelowTarget: number
  minEdge: number
  maxEdge: number
  meanEdge: number
  generationMs: number
  iterations: number
  budgetExceeded: boolean
}
```

Reglas de identidad:

- `nodeId` se deriva de `(u,v)` cuantizados + `specHash` + `algorithmVersion`.
  Es determinista para el mismo spec y versión de algoritmo.
- `edgeId` se deriva de `nodeId` ordenados; `cellId` se deriva de sus nodos.
- Los IDs son **sólo estables dentro de una generación**. No se promete
  estabilidad entre seeds, cambios de topología, cambios de parámetros ni
  versiones de algoritmo. Para trazabilidad externa se usa `specHash`, no el ID.
- `openingPolygon` es el polígono de la celda **insetado** por
  `strutDiameter/2` en la métrica local. `openingWidth` es una estimación
  geométrica (inradio/distancia mínima entre bordes) y no una garantía de
  impresión. Si el ancho es menor que `minOpeningWidth`, la celda se marca para
  merge/descarte; el sólido final se valida aparte.

## 3.4 Algoritmo de distribución

### 3.4.1 Métrica de la superficie

Para una superficie de revolución:

```text
S(θ,z) = (R(z)cosθ, R(z)sinθ, z)
ds² = R(z)² dθ² + (1 + R'(z)²) dz²
dA = R(z) sqrt(1 + R'(z)²) dθ dz
```

El algoritmo no debe usar un radio nominal único para toda la altura. Usa:

- coordenada desenrollada `X = θ · R_ref` para el diagrama;
- **área real** de cada celda calculada sobre la superficie, no en el plano;
- `targetArea` local = `targetSize² / density(θ,z)`.

**Limitación explícita:** `X = θ·R_ref` es un desenrollado aproximado de la
superficie. No es una métrica geodésica: la distancia entre seeds y los
bisectores no respetan la curvatura real. Calcular el área de la celda sobre la
superficie corrige el **objetivo de área**, pero no convierte el diagrama en un
Voronoi geodésico. Para Fase 1 esta aproximación es suficiente para controlar
tamaño y organicidad; no se promete equidistancia geodésica. Un Voronoi
geodésico sobre malla (fast marching / mesh Voronoi) queda fuera de alcance y se
evalúa sólo si los benchmarks muestran que la aproximación no alcanza el
objetivo de calidad.

### 3.4.2 Seeds

1. Estimar el área lateral `A` sobre `[zMin, zMax]`.
2. `cellCount = clamp(round(A / meanTargetArea), 4, maxCells)`, donde
   `meanTargetArea` deriva de `targetSize²` como pitch característico.
   La relación entre pitch y área depende de la forma de la celda; es una
   aproximación, no una igualdad.
3. Generar seeds con una distribución **tipo blue-noise / Poisson-disk**
   (determinista, sin dependencias) o, como mínimo, un muestreo por área con
   jitter controlado.
4. `irregularity` controla el jitter de posición y la aceptación; `0` produce
   una red más regular, `1` más orgánica pero todavía con un mínimo de
   separación.
5. `density` multiplica la densidad de seeds y el `targetArea` local.
6. `aspect` escala la coordenada `z` (o `X`) antes del diagrama para alargar
   celdas; el área se sigue midiendo en la superficie real.

### 3.4.3 Power diagram con objetivo de área

Un Voronoi plano no corrige la variación de `R(z)`. Se propone un **power
diagram** (Voronoi con pesos) en `(X,z)`:

- Distancia power entre un punto `x` y una seed `i`:
  `d_i²(x) = |x - p_i|² - w_i`.
- La celda `i` es el conjunto de puntos donde `d_i²` es mínimo.
- El bisector entre `i` y `j` es una recta:
  `2(p_j - p_i)·x <= |p_j|² - |p_i|² + w_j - w_i`.
- Se recorta con `clipHalfPlane` (ya existe), igual que el Voronoi actual.

Iteración:

```text
for iteration in 0..relaxation:
  cells = powerCells(seeds, weights)
  for each interior cell:
    area = surfaceArea(cell)          // integra R(z) sobre el polígono
    error = area - targetArea
    weight[i] -= kappa * error        // más peso => celda más grande
    position[i] = areaCentroid(cell)  // Lloyd en la superficie
  if max|error| < tolerance: break
```

- `kappa` se calibra (p. ej. 0.1–0.3) y se documenta.
- Las celdas de borde no se usan para el CV ni para el ajuste de peso; se
  marcan `boundary: true`. Si se usa `boundaryMode:'pad'`, se genera un margen
  exterior para que las celdas de borde tengan área completa, y luego se
  recortan para la salida.
- `relaxation=0` conserva la distribución inicial (más orgánica); valores
  altos regularizan. El preset puede usar 3–4.
- El resultado es determinista: PRNG con seed, orden estable, cuantización y
  sin `Math.random`.

### 3.4.4 Aperturas y clearance

- Para cada celda, insetar el polígono por `strutDiameter/2` en la métrica
  local. El inset se calcula con semiplanos desplazados; la celda es convexa.
- El criterio es **ancho libre mínimo**, no área. Para una apertura convexa, el
  ancho se estima con el inradio (`2·inradius`) o con la distancia mínima entre
  lados opuestos. Una apertura alargada puede tener área suficiente y ancho
  insuficiente; por eso el área no es el criterio.
- Si el ancho estimado < `minOpeningWidth`, intentar merge con la celda vecina
  más grande; si no es posible, marcar la celda como `invalidOpening` y
  reportar.
- La red de centerlines sigue siendo el borde de las celdas; la apertura es el
  polígono interior. Esto permite que Fase 2 dimensione struts y joints sin
  volver a descubrir las aperturas.
- **Alcance:** esta validación es geométrica y de distribución. La garantía de
  fabricación se obtiene en Fase 2 con un **gauge** sobre el sólido final: un
  cilindro/cápsula de diámetro `minOpeningWidth` que debe atravesar la
  apertura. Fase 1 no debe presentar el ancho estimado como una garantía de
  impresión.

### 3.4.5 Boundary / floor / rim

- Las celdas que tocan `zMin` o `zMax` se marcan como boundary.
- El piso y el rim no forman parte de la red celular; son bandas sólidas
  declaradas en `bands`.
- La red debe respetar `zMin`/`zMax`; no debe cortar el piso ni el rim.
- `boundaryMode:'flag'` es el default; `clip` recorta; `pad` añade margen para
  el cálculo y recorta después.

## 3.5 Integración con generador, preview y Fabricate

### Generador

- `surface-lattice` conserva su id y sus parámetros actuales.
- Nuevos parámetros opcionales: `density`, `irregularity`, `relaxation`,
  `aspect`, `minOpeningWidth`, `boundaryMode`, `algorithmVersion`.
  `cellSize` se normaliza a `targetSize`; no se renombra el parámetro del
  documento en esta fase.
- `generate()` normaliza `LatticeSpec`, llama `buildLatticeNetwork(spec)` y
  emite **un `Curve3D` por arista** para el viewport (compatibilidad).
- El `meta` de cada curva incluye `specHash`, `cellId`, `edgeId` y stats
  resumidas; no incluye la red completa.

### Preview

- `lattice-preview` sigue mostrando las curvas de la red.
- El preview sólido sigue usando la malla preparada y la simplificación
  existente.
- Los cambios de densidad/irregularidad invalidan la red y el preview; cambios
  de cámara/estilo no.

### Fabricate

- `buildLatticeCandidate` deja de inferir la red desde las curvas: recibe la
  `LatticeNetwork` desde el mismo builder (o la reconstruye con el spec).
- El sólido de Fase 1 sigue siendo tubos + esferas + piso + rim; la diferencia
  es que los nodos/aristas/celdas son explícitos y medibles.
- El reporte incluye `lattice.cellStats`, `opening`, `specHash`.
- La perforación usa los **centroides de celdas** o los seeds de la misma red,
  no una reconstrucción separada.

### Caché

- Clave: `sha256(canonicalStringify(spec))`.
- Ámbito: memoria del módulo (WeakMap o Map acotado) y worker.
- Invalidación: seed, targetSize, density, irregularity, aspect, relaxation,
  perfil, altura, zMin/zMax.
- No invalidan: cámara, estilo, passes, preview mode.
- El documento no guarda la red; sólo el spec derivado de params.

## 3.6 Migración y compatibilidad

- Documentos viejos sin nuevos campos: defaults (`density=1`,
  `irregularity=0.15`, `relaxation=3`, `aspect=1`, `boundaryMode='flag'`,
  `minOpeningWidth=2`). `cellSize` existente se mapea a `targetSize`.
- `Lattice Vase 200` migra al nuevo default; `Perforated Vase 200` usa la misma
  red para sus seeds.
- `Solid Vase 200` no cambia.
- No se cambia `DOCUMENT_VERSION`; los campos son opcionales.
- `surface-lattice` sigue emitiendo `curve3d`; no se agrega un geometry kind
  nuevo. La red es un sidecar derivado.

## 3.7 Presupuestos y rendimiento

Fase 1 **no** introduce perfiles de calidad de acabado. Sólo tiene un budget de
distribución. Los valores son **provisionales** hasta medir los presets reales
en la implementación.

| Parámetro | Default propuesto | Límite provisional |
|---|---:|---:|
| Celdas máx. | 300 | 500 |
| Iteraciones | 4 | 8 |
| Tiempo objetivo (200 mm, 20 mm) | <150 ms | <300 ms |
| Tiempo 15 mm | <400 ms | <800 ms |

Si se excede el budget, el builder devuelve un error de complejidad o reduce
iteraciones, nunca cuelga la UI. La generación de red es más liviana que el
sólido; el sólido sigue en el worker. Los tiempos deben medirse con 15/20/25 mm
antes de convertirlos en gate.

## 3.8 Criterios de aceptación

**Garantías funcionales verificables:**

- Mismo spec + `algorithmVersion` → mismo hash de red y mismas curvas.
- Todos los nodos y muestras de arista caen sobre `R(z/height)` dentro de la
  tolerancia declarada.
- Las celdas del power diagram son convexas y no degeneradas.
- Cada celda tiene `openingPolygon` y un `openingWidth` estimado.
- El budget devuelve error estructurado; no hay red parcial.
- Preview y Fabricate comparten el mismo `specHash`.

**Objetivos de calidad (provisionales):**

- CV de área de celdas interiores < 0.20 (objetivo), < 0.25 (mínimo
  provisional).
- Diámetro equivalente interior dentro de ±10% de `targetSize` para 20 mm.
- `openingWidth` estimado ≥ `minOpeningWidth` en celdas interiores.
- Densidad monótona; irregularidad sin celdas degeneradas; boundary excluido
  del CV.
- Los tres presets siguen exportando.

**Benchmarks pendientes:**

- Medir CV real en `Lattice Vase 200` y en 15/20/25 mm.
- Medir tiempo de red y memoria.
- Decidir si la aproximación `X=θ·R_ref` alcanza el objetivo o si hace falta
  una métrica geodésica.
- Calibrar `kappa`, tolerancia de área e iteraciones.

**Valores provisionales:** 0.20/0.25, ±10%, 2 mm, 150/300 ms, 300/500 celdas.
No son garantías hasta la medición.

## 3.9 Tests previstos

- Unitarios de `normalizeLatticeSpec` (rangos, defaults, error de expresión).
- Unitarios de power diagram: área, convexidad, celdas de borde, merge de
  aperturas.
- Estadísticas: CV, min/max, apertura.
- Determinismo y cambio de seed.
- Densidad/irregularidad/aspect monótonos.
- Integración con `surface-lattice` (curvas) y `buildLatticeCandidate`.
- Regresión de presets y export STL.
- E2E: preview y Fabricate con el nuevo default.

## 3.10 Riesgos de Fase 1

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Power diagram inestable con pesos | Alto | Clamp de pesos, tolerancia, iteraciones acotadas |
| Ajuste de área costoso | Medio | Presupuesto, convergencia temprana, cache |
| Celdas de borde contaminan métricas | Medio | Flag y CV sólo interior |
| Inset vacío en celdas pequeñas | Medio | Merge/descarte y reporte |
| Cambio de topología rompe IDs | Bajo | IDs sólo dentro del spec; cache por hash |
| Doble cálculo preview/Fabricate | Medio | Builder único + cache |
| Deriva de presets | Bajo | Defaults y tests de regresión |
| Métrica aproximada no alcanza CV | Medio | Benchmark; geodésica como evolución |
| Área confundida con ancho | Medio | `openingWidth` y gauge en Fase 2 |
| IDs inestables entre specs | Bajo | IDs sólo en generación; `specHash` para trazabilidad |

---

# 4. Fase 2 — Struts orgánicos, intersecciones y acabado

## 4.1 Objetivo

Convertir la red de Fase 1 en un sólido con **nervios curvos, radio variable y
uniones orgánicas**, preservando aperturas, silueta y fabricabilidad. No se
cambia el documento ni el modo; se cambia la derivación del sólido.

## 4.2 Contratos

```text
OrganicStrutSpec {
  network: LatticeNetwork
  curve: {
    kind: 'centripetal-catmull-rom'
    frame: 'surface' | 'world'     // 'surface' recomendado
    surfaceTolerance: number       // mm, sólo si frame='world'
    seamMode: 'unwrap' | 'reject'
    maxDeviation: number
    minSamples: number
    maxSamples: number
  }
  radius: {
    base: number              // strutDiameter/2
    profile: 'constant' | 'taper' | 'expression'
    expression: string | null
    min: number
    max: number
  }
  section: { kind: 'circle' } // Fase 2 sólo círculo
  joint: {
    style: 'technical' | 'rounded' | 'blend' | 'auto'
    method: 'sdf-levelset' | 'rounded' // candidato; benchmark pendiente
    radius: number
    blendRadius: number
    resolution: number
    maxAngle: number          // grados; sólo nodos con ángulo menor
    overlap: number           // solape tubo-joint, mm
  }
  envelope: {
    mode: 'centerline' | 'outer'
    target: number | null     // R nominal si mode='outer'
  }
  finishQuality: 'draft' | 'standard' | 'high'
}

LatticeSolidSpec {
  network: LatticeNetwork
  struts: OrganicStrutSpec
  floor: number
  rim: number
  manufacturing: {
    minStrut: number
    minJoint: number
    minOpeningWidth: number   // ancho libre, no área
    overhangAngle: number
    openingGauge: 'capsule'   // criterio de validación final
  }
}

LatticeSolidResult {
  mesh: Mesh
  validation
  stats: {
    struts, joints, blendedJoints, fallbackJoints,
    triangles, volume, buildMs, finishQuality
  }
  provenance: {
    specHash, networkHash, algorithmVersion,
    jointStyle, finishQuality, toolVersion
  }
}
```

`OrganicStrutSpec.finishQuality` es el valor **resuelto** para la derivación.
La preferencia persistida propuesta es `view.fabrication.finishQuality`; el
nombre/ubicación exactos son una decisión pendiente (D9). No se reutiliza
`view.fabrication.quality`, que controla reparación/SDF.

## 4.3 Centerlines orgánicas

- Cada arista se interpola en **coordenadas de superficie** `(θ,z)` (o `(u,v)`
  en una superficie general), no directamente en 3D. Los puntos de control se
  muestrean sobre `S(θ,z)` después de interpolar.
- **Seam:** `θ` es periódica. Para cada arista se elige el camino angular más
  corto y se desenvuelve `±2π` si cruza la costura; el muestreo se hace en el
  dominio desenvuelto y se vuelve a mapear a 3D. `seamMode:'reject'` es una
  alternativa conservadora si el desenrollado no es fiable.
- **Continuidad:** en cadenas de grado 2 se usa una tangente común en el nodo;
  en nodos de grado ≥ 3 no se promete G1 global entre todas las aristas. El
  joint de Fase 2 resuelve la continuidad visual; la curva no debe fingir una
  continuidad que la topología no permite.
- **Superficie:** si una implementación usa 3D por simplicidad, cada muestra
  debe proyectarse/corregirse a la superficie y reportar la desviación máxima
  (`surfaceTolerance`). No se asume que Catmull-Rom 3D preserve la superficie.
- **Estabilidad:** Catmull-Rom centrípeta, tangentes clamp, sin overshoot;
  muestreo adaptativo por desviación de cuerda (`maxDeviation`) y budget
  (`minSamples`, `maxSamples`).
- **Compatibilidad:** Fase 2 es superficie de revolución; una superficie UV
  general queda para una fase posterior. La curva sigue siendo una `Curve3D`
  de centerline para el contrato de red.

**Por qué Catmull-Rom:** bajo costo, determinista, sin dependencias, buena
continuidad C1 en cadenas y compatible con `tubeMesh`. B-spline queda como
alternativa posterior si se necesita control local. La interpolación en
superficie es la que evita que los struts se despeguen de la silueta.

## 4.4 Radio variable y sección

- `radiusAt(t)` a lo largo de la curva; `constant` por defecto, `taper` en los
  extremos, o `expression` segura.
- Clamp `[min, max]`; `min` debe ser ≥ `minStrut/2`.
- Sección circular en Fase 2; el contrato deja `section.kind` para futuras
  secciones elípticas.
- El tubo se genera con frames por parallel transport (ya existe); se agrega
  radio por anillo y tapas redondeadas o planas según el joint.
- La envolvente exterior se controla con `envelope.mode`:
  - `centerline`: el radio se centra en la red (comportamiento actual del
    preset, que ya insetaba el perfil);
  - `outer`: el radio se desplaza hacia dentro para que el borde exterior
    coincida con `R(v)`.
  El preset debe declarar el modo; no debe esconder una resta de 1.75 mm en la
  expresión del perfil.

## 4.5 Uniones orgánicas

### Estilos

| Estilo | Descripción | Uso |
|---|---|---|
| `technical` | Esfera low-poly actual | Fallback, comparación |
| `rounded` | Esfera de mayor resolución | Draft/standard barato |
| `blend` | SDF local + `Manifold.levelSet` | Acabado orgánico |
| `auto` | Blend si el presupuesto lo permite; si no, rounded | Default |

### Blend local: contrato de integración

El método SDF local es un **candidato**, no una decisión cerrada. Debe validarse
con un spike/benchmark antes de ser el default. La alternativa de Fase 2 es
`rounded`.

Para cada nodo seleccionado:

1. **Región local:** reunir los segmentos incidentes hasta una longitud
   `L = jointRadius + blendRadius + overlap`, con una caja de recorte que
   contenga esos segmentos y el radio máximo.
2. **SDF:** construir un SDF de cápsulas
   `d(x) = min_i (dist(x, segment_i) - r_i)`, con smooth-min (`smin`) de radio
   `blendRadius`. El SDF incluye los tubos hasta dentro de la región, no sólo
   el punto del nodo.
3. **Solape:** los tubos deben extenderse dentro de la región local al menos
   `overlap` (p. ej. 0.5–1 mm) para que la unión no deje gaps. El mesh local
   debe intersectar volumétricamente los tubos, no tocarlos tangencialmente.
4. **LevelSet:** evaluar en la caja local con `resolution` (p. ej. 0.3–0.6 mm)
   y `Manifold.levelSet`; validar closed/manifold/volumen antes de unir.
5. **Unión:** unir el mesh local con los tubos, piso y rim con Manifold.
6. **Openings:** comprobar que el joint no invade la apertura; usar el gauge de
   ancho (`minOpeningWidth`) o una distancia equivalente. Si la invade,
   reducir `blendRadius` o hacer fallback.
7. **Fallo:** si el levelSet devuelve error/empty, el mesh local no valida o la
   unión falla, hacer fallback a `rounded`, reportar nodo/arista/motivo y
   continuar. No hay fallback silencioso.
8. **Manifold:** el levelSet y la unión Manifold son la garantía primaria. Si
   se aplican micro-caps, reparación de orientación o simplificación, el flag
   `manifoldGuaranteed` debe limpiarse y el resultado revalidarse; no se puede
   heredar una garantía que el post-proceso ya no sostiene.

Optimizaciones:

- Blend sólo nodos con grado ≥ 3 y ángulo entre aristas < `maxAngle` (p. ej.
  150°).
- Cachear el SDF/mesh local por `(nodeId, specHash, algorithmVersion,
  finishQuality)`.
- En `draft`, usar `rounded`; en `standard`, blend en nodos seleccionados; en
  `high`, blend en todos los nodos elegibles.
- Si el número de nodos es alto, agrupar nodos cercanos en un solo SDF local.

### Lo que no se hace en Fase 2

- No se hace un SDF global del lattice completo (costo y pérdida de aperturas).
- No se hace fillet de malla arbitrario.
- No se promete continuidad G2 global.
- No se agrega un motor de metaballs.
- No se fija `Manifold.levelSet` como única implementación hasta medir su
  costo/calidad; la alternativa `rounded` es válida.

## 4.6 Preservación de aperturas y silueta

- La apertura de cada celda ya viene calculada en Fase 1 como
  `openingWidth` (estimación) y `openingPolygon`.
- `blendRadius` y `joint.radius` deben dejar el ancho libre; usar
  `minOpeningWidth` como cota de diseño, no `openingArea`.
- El radio de strut debe dejar un ancho libre, no sólo un área.
- El outer envelope no debe superar el target; el inner envelope no debe
  cerrar la apertura.
- **Validación final:** el sólido se valida con un **gauge** de apertura: una
  cápsula de diámetro `minOpeningWidth`, longitud `pared + 2·margen`, centrada
  en el centroide de la apertura y orientada por la normal local, se
  intersecta con el sólido. Si el volumen de intersección supera una tolerancia,
  la apertura no es imprimible. Es una prueba geométrica, no una garantía de
  slicer.
- Un chequeo posterior mide:
  - apertura mínima real por gauge;
  - strut mínimo;
  - joint mínimo;
  - envolvente;
  - overhang.
- Si falla, el reporte indica el nodo/celda y el `finishQuality` usado.

## 4.7 Perfiles de calidad y worker

**Hecho verificado:** el campo existente `view.fabrication.quality`
(`custom|draft|standard|high`) se usa para la resolución de reparación/SDF
(`remeshResolution`), no para el acabado del lattice. No debe reutilizarse en
silencio para el acabado.

Propuesta: un campo separado `view.fabrication.finishQuality`
(`draft|standard|high`), serializable y parte de la preparación. El nombre
exacto es una **decisión pendiente**; lo importante es que el perfil de acabado
no se confunda con la calidad de reparación.

| Perfil | Curva | Sección | Joint | Blend res. | Uso |
|---|---|---:|---|---:|---|
| `draft` | 4–8 muestras | 8 lados | `rounded`/`technical` | — | Preview rápido |
| `standard` | 8–16 | 12 lados | `rounded` o blend selectivo si el benchmark lo aprueba | 0.6 mm | Default Fabricate |
| `high` | 16–32 | 16 lados | `rounded` high-res o blend amplio si se aprueba | 0.3 mm | Export final |

Contrato de ejecución:

- El perfil se resuelve en el hilo principal y se incluye en `preparation`; el
  worker no adivina defaults.
- `buildFabricationReport` lo pasa a `buildLatticeCandidate`; el reporte y el
  `LatticeSolidResult` lo registran.
- Preview y Fabricate usan la **misma calidad de fuente**; el preview puede
  simplificar sólo la malla de pantalla. No puede cambiar a `standard` si el
  usuario eligió `high`.
- El export usa el perfil seleccionado. Si se necesita un mínimo de export, se
  define `exportQuality` explícito; no se sube silenciosamente.
- Cambiar `finishQuality` invalida el reporte y relanza el worker; cambiar sólo
  el modo de preview no.
- La UI debe distinguir “Repair resolution” (calidad existente) de “Finish”
  (nuevo perfil). Si se decide reutilizar un único selector, se documenta el
  acoplamiento y se testea; no se asume.

**Decisión pendiente:** nombre/ubicación del campo de acabado y si el export
puede subir de calidad. Recomendación: `finishQuality` separado, sin upgrade
silencioso.

## 4.8 Preset

- Mantener `Lattice Vase 200` como referencia **técnica** (joints `technical`).
- Agregar `Organic Lattice Vase 200` con:
  - `density=1`, `targetSize=20`, `irregularity=0.2`, `relaxation=3`;
  - `strut=3.5`, `minOpeningWidth=6` (valor inicial; el gauge final manda);
  - `jointStyle='auto'`, `finishQuality='standard'`; el estilo exacto
    (rounded/blend) se fija después del benchmark;
  - `envelope='outer'`, `R(v)` nominal 175 mm.
- El preset sigue siendo un documento paramétrico; no un modo nuevo.
- `Perforated Vase 200` no cambia en Fase 2.

## 4.9 Validación y fabricación

- `LatticeSolidResult` debe ser closed, manifold, oriented, volumen >0. La
  garantía primaria viene de Manifold (levelSet/union); si hay post-proceso,
  `manifoldGuaranteed` se limpia y se revalida. No se afirma una garantía
  absoluta de auto-intersecciones después de post-procesos.
- `printChecks` se extiende con:
  - strut mínimo real;
  - joint mínimo;
  - apertura mínima por gauge de ancho;
  - overhang del blend.
- El export STL/3MF sigue usando la malla completa (no la de preview) y el
  `finishQuality` seleccionado.
- El worker sigue siendo el camino para `finishQuality=high`; cancelación y
  progreso.
- Si el blend no valida, el sólido no se exporta; se reporta el nodo, el motivo
  y el fallback.

## 4.10 Criterios de aceptación de Fase 2

**Garantías funcionales verificables:**

- Closed/manifold/oriented/volumen positivo (o fallo explícito).
- Cada apertura interior pasa el gauge de ancho `minOpeningWidth`; las que no,
  se reportan y no se presentan como fabricables.
- Radio mínimo ≥ `minStrut/2`; joint mínimo ≥ `minJoint/2`.
- Mismo spec + `algorithmVersion` + `finishQuality` → mismo hash de malla.
- STL/3MF válidos y triángulos consistentes.
- `Solid Vase 200`, `Perforated Vase 200` y `Lattice Vase 200` no cambian.

**Objetivos de calidad (provisionales):**

- ≥95% de celdas interiores con apertura ≥ target; el resto reportado.
- Envolvente exterior dentro de ±1 mm del target (175 mm en el jarrón).
- Revisión visual: sin quiebres en cadenas de grado 2, joints sin
  discontinuidad evidente, aperturas preservadas, acabado orgánico controlado.
- `standard` 20 mm <15 s; `high` <45 s; preview <100 ms.

**Benchmarks pendientes:**

- Validar el método SDF local (costo, calidad, fallos) contra `rounded`.
- Medir 15/20/25 mm, triángulos, memoria y tiempos reales.
- Calibrar `blendRadius`, `resolution`, `overlap`, `maxAngle`.
- Confirmar el 95%, ±1 mm y los tiempos; son provisionales.

**Valores provisionales:** 95%, ±1 mm, 15/45 s, 100 ms. No son garantías hasta
la medición.

## 4.11 Tests previstos

- Catmull-Rom en superficie: continuidad, seam, no overshoot, desviación,
  muestreo adaptativo.
- Radio variable: clamp, monotonía, minStrut.
- Joints: technical/rounded/blend; solape; fallback; validación; gauge de
  apertura.
- Envelope: centerline vs outer; 175 mm.
- Calidad: draft/standard/high; determinismo; worker; preview/export sin
  upgrade silencioso.
- Print checks: ancho de apertura (gauge), struts, joints, overhang.
- Regresión de presets y export.
- E2E: `Organic Lattice Vase 200` en Fabricate, preview y STL.

## 4.12 Riesgos de Fase 2

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Blend cierra aperturas | Alto | `blendRadius`/joint vs `minOpeningWidth`; gauge; fallback |
| Costo de cientos de SDF locales | Alto | Blend selectivo, perfiles, cache; benchmark |
| Manifold falla en joints densos | Medio | Rounded fallback; presupuesto |
| Curva 3D se despega de la superficie | Alto | Interpolar en (θ,z)/(u,v); proyectar; tolerancia |
| Cruce de seam | Medio | Desenvolver θ; tests de seam |
| Overshoot de Catmull-Rom | Medio | Centripetal; clamp de tangentes; desviación |
| Envolvente se engrosa | Medio | `envelope='outer'`; chequeo |
| Perfil de calidad ignorado | Medio | `finishQuality` en prep/report; tests de worker/export |
| Overhang del blend | Medio | printChecks; orientación manual |
| Garantía manifold heredada | Medio | Limpiar flag tras post-proceso; revalidar |
| Determinismo flotante | Bajo | Orden estable, cuantización, tests |
| Scope creep a CAD | Alto | Mantener spec paramétrico y presets |

---

# 5. Arquitectura de módulos propuesta

No se implementa en esta tarea; se propone la forma.

```text
src/geometry/lattice/
  spec.js            normalizeLatticeSpec, hash, defaults
  field.js           muestreo de seeds, blue-noise, densidad
  power.js           power diagram, clipping, áreas
  network.js         buildLatticeNetwork, nodos/aristas/celdas, stats
  openings.js        inset, merge, minOpeningWidth
  curves.js          Catmull-Rom, tangentes, muestreo adaptativo
  struts.js          tubos de radio variable, secciones
  joints.js          technical/rounded/blend, SDF local
  solid.js           buildLatticeSolid, piso/rim, unión, validación
  profiles.js        draft/standard/high
```

Reglas:

- `spec.js`, `field.js`, `power.js`, `network.js`, `openings.js` son puros y
  testeables en Node.
- `joints.js` usa `manifoldEngine`/`manifoldLevelSet`; no importa p5.
- `solid.js` usa `booleanSolids`, `validateMesh`, `repair`; no importa UI.
- `src/generators/surfaceLattice.js` sólo normaliza params y emite preview.
- `src/application/fabricationSource.js` orquesta; no implementa geometría.
- `src/geometry/perforation.js` consume `network.cells`/seeds; no reconstruye
  una red distinta.

**Compatibilidad:** el módulo `latticeNetwork.js`/`latticeSolid.js` actual puede
migrar a esta carpeta por partes; no se elimina hasta que las dos fases estén
archivadas y los presets migrados.

---

# 6. Contratos que deben preservarse

- `Document` v3 y `sanitizeDocument`; los nuevos campos son opcionales.
- `Curve3D` como preview de la red.
- `Mesh`/`Solid` y `validateMesh`/`validateSolid`.
- `booleanSolids`/Manifold y el worker.
- `FabricationReport` y `printChecks` (extendidos, no reemplazados).
- `RenderScene`/`ViewTransform`; el lattice no toca la cámara.
- `Fabricate` como derivación; no escribe la malla en el documento.
- IDs estables sólo dentro de una generación/spec; `specHash` para trazabilidad.
- `manifoldGuaranteed` se limpia tras cualquier post-proceso que cambie
  topología; el resultado se revalida.
- Calidad de reparación/SDF y calidad de acabado son conceptos separados.
- Aperturas: ancho libre y gauge; el área es diagnóstico, no garantía.
- La métrica de Fase 1 es una aproximación; no se presenta como geodésica.
- Modos actuales; no se agrega un modo nuevo.

---

# 7. Decisiones que requieren aprobación

| ID | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D1 | ¿Power diagram o Voronoi con densidad? | Voronoi + densidad / power diagram | **Power diagram** para control de área; validar con benchmark |
| D2 | ¿Persistir `LatticeSpec`? | Documento / derivado / preset metadata | **Derivado** + metadata de preset |
| D3 | ¿Alcance de superficie? | Revolución / Surface UV general | **Revolución primero**; UV general después |
| D4 | ¿Estilo de joint default? | technical / rounded / blend / auto | **rounded** al inicio; `blend` opt-in tras benchmark. No cerrar `auto` sin evidencia |
| D5 | ¿Perfil default de export? | standard / high | **standard**; high opt-in; validar tiempos |
| D6 | ¿Nuevo preset orgánico? | actualizar `Lattice Vase 200` / agregar `Organic Lattice Vase 200` | **agregar** para comparar |
| D7 | ¿Presupuesto de blend? | número de nodos / calidad | **por perfil**, con límite; benchmark |
| D8 | ¿Apertura mínima? | área / ancho / diámetro | **ancho libre** (`minOpeningWidth`); valor por proceso/nozzle |
| D9 | ¿Campo de calidad de acabado? | reutilizar `quality` / `finishQuality` separado | **separado**; no acoplar reparación y acabado |
| D10 | ¿Método de joint? | SDF local / rounded / auto | **rounded** inicial; SDF como candidato a benchmark |
| D11 | ¿Interpolación de curvas? | 3D + proyección / superficie (θ,z)/(u,v) | **superficie**; 3D sólo con tolerancia y reporte |
| D12 | ¿Validación de aperturas? | área / ancho / gauge | **gauge de ancho** en el sólido; área sólo diagnóstico |
| D13 | ¿Métrica de Fase 1? | `X=θ·R_ref` / geodésica | **aproximación** para Fase 1; geodésica sólo si benchmark lo exige |

---

# 8. Orden de implementación recomendado

```text
Fase 0 (contratos y docs, ya auditada)
  └─ Fase 1:
       spec/normalización
       field/power/network
       openings/metrics
       generator + cache + preset
       tests/aceptación
       archivar
  └─ Fase 2:
       curves/radius
       joints technical/rounded
       blend selectivo
       envelope/quality/preset
       print checks/aceptación
       archivar
```

La Fase 2 no debe empezar a implementarse hasta que la Fase 1 esté archivada y
el contrato `LatticeNetwork` esté congelado. La Fase 2 puede diseñarse en
paralelo, pero no debe modificar `lattice-spec` sin una revisión.

---

# 9. Mapeo a OpenSpec

| Cambio | Fase | Capabilities | Depende de | Estado |
|---|---|---|---|---|
| `2026-11-06-lattice-cell-contracts` | 1 | `lattice-spec`, `surface-lattice` | auditoría + specs de geometría | implementado; pendiente archivar |
| `2026-11-06-organic-struts` | 2 | `organic-struts`, `surface-lattice`, `printability-checks` | Fase 1 | implementado; pendiente archivar |
| `2026-11-06-export-integrity` | 0.5 | `export-integrity` | 3MF + Manifold | especificado |
| `2026-11-06-lattice-refinement` | 3 | `lattice-refinement` | Fases 1–2 + sampling | especificado |
| `2026-11-06-manufacturing-profile` | 5 | `manufacturing-profile` | Fases 1, 3 + fabricación | especificado |
| `2026-11-06-fabrication-preview` | 4 | `fabrication-preview` | `RenderScene` + malla preparada | especificado |

La Fase 4 (apariencia/PBR) está **implementada como primera slice** en
`2026-11-06-fabrication-preview`: backend WebGL/PBR opcional detrás de
`RenderScene`, con material, luces y sombras, p5 como default técnico y fallback
explícito. Es independiente de la geometría y no cambia export ni validación.
Incluye AO en pantalla, controles de material/luz y export PNG de presentación. Quedan pendientes el benchmark en GPU real y una política estable de screenshots en CI.

# 9.1 Cómo llegar a los resultados esperados

```text
Fase 0.5  export-integrity
  └─ 3MF triángulos completos
  └─ manifoldGuaranteed sin herencia

Fase 3    lattice-refinement
  └─ RefinementSpec derivado
  └─ muestreo adaptativo en superficie + desviación
  └─ gauge de cápsula + presupuesto medido
  └─ benchmark 15/20/25 + evidencia visual
  └─ decisión SDF vs rounded con gate

Fase 5    manufacturing-profile
  └─ perfil serializable y presets provisionales
  └─ reporte con measured/declared/estimated/unavailable
  └─ warn por defecto; block opt-in
  └─ validación externa manual, no gate

Fase 4    fabrication-preview (en paralelo, después de Fase 3)
  └─ backend WebGL/PBR opcional detrás de RenderScene
  └─ material + luces + sombras + AO opcional
  └─ misma malla preparada; p5 sigue siendo default técnico
  └─ lazy load, fallback y presupuesto de bundle
```

Orden recomendado: **0.5 → 3 → (4 y 5)**. El perfil de fabricación no debe
declarar “medido” lo que todavía es una estimación; por eso consume el gauge y
la desviación de la Fase 3. La Fase 4 puede ir en paralelo con la Fase 5 una vez
exista un sólido medido que merezca la pena previsualizar. La Fase 3 no debe
empezar hasta cerrar y archivar las Fases 1–2.

**Resultados esperados (clasificados):**

- **Garantías funcionales:** determinismo por spec/version/quality; topología
  preservada por refinamiento; 3MF sólo triángulos; export inválido bloqueado;
  perfil resuelto en worker/reporte/export.
- **Objetivos provisionales:** desviación bajo tolerancia; aperturas medidas;
  presupuestos de puntos/triángulos/tiempo; presets sin regresión.
- **Benchmarks pendientes:** 15/20/25 mm, coste del gauge, SDF vs rounded,
  calibración FDM/resina y validación externa en slicer.
- **Valores provisionales:** tolerancia 0.1 mm, perfiles FDM/resina, overhang
  45–50°, presupuestos de tiempo. No son gates hasta medirlos.

# 10. Criterio de éxito global

La evolución es exitosa si, sin cambiar la identidad de Parametrica:

- el lattice se siente **orgánico controlado**, no ruido ni CAD;
- las celdas son **medibles** y el usuario puede controlar densidad,
  irregularidad y tamaño;
- las aperturas y la silueta se preservan;
- los struts y joints son **fabricables** y validados;
- el documento sigue siendo paramétrico y la malla sigue siendo derivada;
- el preview y el export son rápidos y deterministas;
- el sistema sigue siendo comprensible: un `LatticeSpec`, una `LatticeNetwork`,
  un `LatticeSolidResult`.
