# Revisión de propuestas — Lattice orgánico

**Base:** commit `35fda6d`.
**Naturaleza:** revisión documental; no se implementó código, no se crearon
commits y no se archivaron propuestas.
**Alcance:** Fase 1 (`lattice-cell-contracts`) y Fase 2 (`organic-struts`).

> El brief original termina en “Control…”. Se asumió control de densidad,
> curvatura, grosor, aperturas y fabricación. Confirmar antes de archivar.

---

# 1. Archivos actualizados

| Archivo | Cambio principal |
|---|---|
| `docs/lattice-organic-architecture.md` | Métrica aproximada, openings por ancho, interpolación en superficie, contrato de joints SDF, separación de calidad, alcance por fase, criterios clasificados, decisiones D9–D13, tabla de afirmaciones verificadas. |
| `openspec/changes/2026-11-06-lattice-cell-contracts/README.md` | Aclara que `X=θ·R_ref` es aproximado, no geodésico. |
| `.../lattice-cell-contracts/proposal.md` | Distribución aproximada, opening width, sin perfiles de acabado en Fase 1. |
| `.../lattice-cell-contracts/design.md` | Límite métrico, targetSize pitch, opening width, IDs/algorithmVersion, criterios provisionales. |
| `.../lattice-cell-contracts/tasks.md` | IDs, opening width, benchmarks; sin calidad de acabado. |
| `.../lattice-cell-contracts/specs/lattice-spec/spec.md` | Requisito de aproximación métrica, `targetSize` pitch, `openingWidth`, IDs por generación, `algorithmVersion`, alcance sólo distribución. |
| `.../lattice-cell-contracts/specs/surface-lattice/spec.md` | `targetSize`/`openingWidth`, aproximación no geodésica, sin garantía de impresión. |
| `openspec/changes/2026-11-06-organic-struts/README.md` | Curvas en superficie, SDF candidato/benchmark, calidad separada. |
| `.../organic-struts/proposal.md` | Interpolación en superficie, blend local candidato, finish quality separado, gauge de ancho. |
| `.../organic-struts/design.md` | Contrato de joints, solape, fallback, garantía Manifold, calidad/worker, preset condicionado al benchmark. |
| `.../organic-struts/tasks.md` | Seam/superficie, benchmark SDF vs rounded, plumbing de calidad, gauge, limpieza de `manifoldGuaranteed`. |
| `.../organic-struts/specs/organic-struts/spec.md` | Interpolación en superficie/seam/tolerancia, región local, solape, método candidato, apertura por gauge, calidad separada, procedencia. |
| `.../organic-struts/specs/surface-lattice/spec.md` | Joints localizados, apertura por gauge, finishQuality separado, export sin upgrade. |
| `.../organic-struts/specs/printability-checks/spec.md` | Apertura por ancho/gauge; área diagnóstica. |

---

# 2. Inconsistencias resueltas

1. **“Métrica geodésica” implícita.** `X = θ·R_ref` se documenta como
   desenrollado aproximado. El área se mide sobre la superficie; las distancias
   y bisectores no son geodésicos. La geodésica queda fuera de Fase 1.
2. **Opening por área.** `openingArea < minOpening²` se reemplaza por un ancho
   libre estimado (`openingWidth`/`minOpeningWidth`). El área queda como
   diagnóstico. La red estima; el sólido final valida con un gauge.
3. **Catmull-Rom 3D.** Se interpola en `(θ,z)/(u,v)`, con unwrap de seam,
   mapeo a la superficie, tolerancia y reporte de desviación si se usa 3D.
4. **Joints SDF sin integración.** Se define región local, solape, levelSet,
   unión, preservación de aperturas, fallback, limpieza de
   `manifoldGuaranteed` y benchmark. No se fija el SDF como implementación
   definitiva.
5. **Parámetros ambiguos.** `targetSize` se define como pitch característico;
   `minOpeningWidth` es ancho; IDs sólo estables dentro de una generación;
   `algorithmVersion` entra en el hash.
6. **Calidad acoplada.** El `quality` existente es reparación/SDF. El acabado
   usa un campo separado propuesto (`finishQuality`), con contrato de worker,
   preview y export.
7. **Alcance mezclado.** Fase 1 se limita a distribución/openings/contratos;
   radios, joints, curvatura y calidad de acabado son Fase 2.
8. **Umbrales como garantías.** CV, ±10%, 95%, ±1 mm y tiempos se clasifican
   como objetivos/benchmarks/valores provisionales, no como garantías.

---

# 3. Decisiones pendientes

| ID | Decisión | Recomendación |
|---|---|---|
| D1 | Power diagram vs Voronoi con densidad | Power diagram, validar con benchmark |
| D2 | ¿Persistir `LatticeSpec`? | Derivado + metadata de preset |
| D3 | ¿Revolución o Surface UV general? | Revolución primero |
| D4 | Joint default | `rounded` inicial; `blend` opt-in tras benchmark |
| D5 | Perfil default de export | `standard`; high opt-in |
| D6 | ¿Nuevo preset orgánico? | Agregar `Organic Lattice Vase 200` |
| D7 | Presupuesto de blend | Por perfil, con benchmark |
| D8 | Apertura mínima | Ancho libre; valor por proceso/nozzle |
| D9 | Campo de calidad de acabado | `finishQuality` separado de `quality` |
| D10 | Método de joint | `rounded` inicial; SDF local como candidato |
| D11 | Interpolación de curvas | Superficie `(θ,z)/(u,v)`; 3D sólo con tolerancia |
| D12 | Validación de aperturas | Gauge de ancho en el sólido; área diagnóstica |
| D13 | Métrica de Fase 1 | Aproximación `X=θ·R_ref`; geodésica si el benchmark lo exige |

---

# 4. Afirmaciones verificadas contra el código

| Afirmación | Referencia |
|---|---|
| Generador `surface-lattice` y sus parámetros actuales. | `src/generators/surfaceLattice.js` |
| Voronoi periódico, seeds R², 4 Lloyd. | `src/geometry/latticeNetwork.js` |
| Tubos constantes, esferas low-poly, piso/rim, unión Manifold. | `src/geometry/latticeSolid.js` |
| `minOpeningWidth` no existe hoy; sólo `strut`. | `src/generators/surfaceLattice.js` |
| `view.fabrication.quality` se usa para reparación/SDF, no para acabado. | `src/core/document.js`, `src/ui/sections/fabricateSections.js`, `src/ui/Controls.js` |
| `buildLatticeCandidate` usa `radialSegments: 8` fijo. | `src/application/fabricationSource.js` |
| Worker recibe `preparation`; lattice es heavy. | `src/application/fabricationJobs.js`, `fabricationJobRunner.js`, `src/workers/fabricationWorker.js` |
| Preview no relanza el worker; `latticePreview` se excluye del prepKey. | `src/ui/Controls.js` |
| `manifoldGuaranteed` omite auto-intersecciones en validación. | `src/geometry/manifoldEngine.js`, `src/geometry/validate.js` |
| 3MF escribe `face[0..2]` sin triangular. | `src/export/3mf.js` |
| Renderer p5 2D sin PBR. | `src/render/p5/P5Adapter.js`, `package.json` |

---

# 5. Validación documental

- `openspec validate 2026-11-06-lattice-cell-contracts --strict` → válido.
- `openspec validate 2026-11-06-organic-struts --strict` → válido.
- `npm run check:specs` → 110 specs vivas (sin cambios).
- No se modificó código, no se archivó ninguna propuesta y no se creó commit.
