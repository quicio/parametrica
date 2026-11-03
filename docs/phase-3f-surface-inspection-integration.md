# Fase 3F — Surface Inspection Integration & UX Review

> **Estado:** consolidación completada.
>
> **Fecha:** 2026-11-03.
>
> **Base:** fases 3A–3E.
>
> **Naturaleza:** revisión integrada, corrección de un bug real y pruebas de
> convivencia. No se añadieron funcionalidades ni se modificaron contratos
> geométricos.

---

## 1. Estado general

SurfaceMapping, Projection Source, Surface Inspection, overlays visuales,
pin/release, UV Domain y Seam Visualization funcionan como un sistema
coherente en Canvas single.

Puntos verificados:

- picking world-space y overlays apuntan a la misma evaluación;
- marker/triángulo/celda y seams usan transforms de capa;
- SurfaceInspector y SeamLegend son independientes del render;
- pin/release invalida resultados obsoletos;
- UV Domain y SeamLegend se complementan (dominio vs superficie);
- Spatial Reference ahora es visible también en perspectiva;
- exportadores no incluyen ningún overlay.

---

## 2. Hallazgos

| ID | Severidad | Hallazgo | Causa | Corrección | Estado |
|---|---|---|---|---|---|
| 3F-1 | **P1** | Spatial Reference era prácticamente invisible en perspectiva: el extent podía quedar en ~0.045 | `referenceExtent` usaba `frame.bounds / frame.scale` como si fueran unidades world; en perspectiva son unidades proyectadas | Extent calculado con world bounds y cap por extensión horizontal world, nunca por escala de artboard | Corregido |
| 3F-2 | P2 | El seam overlay recalcula al cambiar estilo/reference porque la escena cambia | Cache por `scene`; la escena incluye firma de estilo/reference | Aceptado: el coste es O(faces) y el cache evita repetirlo por frame; se documenta | Limitación de rendimiento |
| 3F-3 | P2 | En mallas densas, celda y seam pueden ser visualmente pequeños | La celda/seam representa una unidad paramétrica real; no se debe agrandar falsamente | Marker screen-constant y leyenda explícita; no se altera la escala | Limitación visual |
| 3F-4 | P3 | `SeamLegend` muestra `twist` aunque no exista un twist activo | La leyenda es explicativa, no un estado por elemento | Se mantiene: el estado dice `declared`/`borders only`/`partial` | Aceptado |
| 3F-5 | P3 | El pin se libera al rotar cámara/proyección | Evita mostrar distancia/depth obsoletos | Se mantiene por seguridad; resize no lo libera | Diseño |

No se encontraron errores P0 en la integración 3A–3E.

---

## 3. Bug reproducido y corregido

### 3F-1 — Reference extent en unidades proyectadas

Reproducción:

1. Abrir Torus.
2. Activar Spatial Reference + Ground.
3. Mantener proyección 3D.

Resultado anterior: `referenceExtent ≈ 0.045`, ejes/grid invisibles.

Causa:

```text
viewSpan = min(frame.bounds.width, frame.bounds.height) / frame.scale
```

`frame.bounds` son unidades proyectadas y `frame.scale` las convierte a
artboard; el cociente no es una longitud world. En perspectiva no se puede usar
para dimensionar un grid world.

Corrección:

- `referenceExtent` usa el `worldBBox`;
- el extent se limita por la extensión horizontal world, no por la escala de
  artboard;
- las formas profundas no desplazan los ejes fuera de pantalla;
- las formas verticales reciben un extent mínimo visible.

No cambia frame, bbox ni geometría.

---

## 4. Coherencia visual

Verificación manual en Torus con todo activo:

- marker de inspección;
- triángulo y celda;
- seams rojos discontinuos;
- Spatial Reference grid/axes;
- UV Domain inset;
- Surface Inspector + PIN;
- SeamLegend.

Resultados:

- no hay solapamiento bloqueante a 1440×900 ni a 900×700;
- inspector abajo-izquierda, leyenda abajo-centro, UV abajo-derecha;
- telemetría no se solapa;
- Quad oculta overlay/leyenda y muestra `Single view only`;
- el grid de referencia queda detrás de la geometría y los seams;
- el marker de inspección queda por encima de seams.

Observaciones aceptadas:

- celda/seam pequeños en mallas densas;
- celda seleccionada y seams comparten familia roja; la celda tiene relleno y el
  seam es discontinuo, diferenciados por forma;
- la leyenda enumera `twist` aunque no haya twist en la escena.

---

## 5. Lifecycle

| Evento | Resultado |
|---|---|
| Hover | actualiza inspector y overlay; no altera geometría |
| Pin | fija resultado; hover no reemplaza la presentación |
| Release | vuelve al hover o a “Hover a surface” |
| Cámara | pin se libera; seams/reference se reproyectan |
| Zoom | pin se libera; seams/reference se reproyectan |
| Proyección | pin se libera; UV/seams usan nueva escena |
| Resize | pin se conserva; overlays se reproyectan |
| Frame/artboard | pin se libera |
| Capa activa | pin se libera; UV Domain cambia |
| Reevaluación | pick se valida contra mesh/mapping actual |
| Playback | pin se libera; inspector pausa; seams siguen UI-only |
| Quad | inspector `Single view only`; seam legend/overlay ocultos |
| Mapping missing/mismatch | inspector lo reporta; seams unavailable/partial |
| Documento | nueva evaluación invalida resultados viejos |

No se observaron referencias a evaluaciones anteriores en el pin.

---

## 6. Rendimiento

Mediciones indicativas en Node local, 5 repeticiones, grid sintético:

| Triángulos | Picking | Build seam overlay |
|---:|---:|---:|
| 1.000 | 0,81 ms | 1,19 ms |
| 10.000 | 1,62 ms | 6,68 ms |
| 50.000 | 2,76 ms | 4,45 ms |
| 100.000 | 2,91 ms | 8,26 ms |

Notas:

- picking es lineal O(triángulos);
- seam build es O(faces) y se cachea por `scene`;
- seam overlay en playback cambia de escena cada frame y puede pagar el coste
  de build;
- no se añadió BVH;
- no se midió en navegador; las cifras son orientativas.

---

## 7. Pruebas integradas

- Torus cerrado con seams + inspector + pin + UV + reference.
- Hyperbolic Saddle abierto: bordes, no seams.
- Dominio invertido.
- Mapping missing.
- Mapping parcial/malformado.
- Perspectiva con cámara inclinada.
- Cambio de cámara con pin.
- Playback con overlays.
- Resize con pin.
- Quad y retorno a single.
- Export SVG/PNG sin overlays.
- Múltiples capas y composición.
- Referencia visible en perspectiva.

Suite:

- `npm run check`: **1924/1924** checks + build.
- `npm run test:e2e`: **115/115** tests.
- `openspec validate --specs --strict`: **73/73** specs.

---

## 8. Archivos modificados

**Producción**

- `src/view/spatialReference.js` (fix de extent)

**Tests**

- `test/lab.smoke.mjs` (reference extent)
- `e2e/surface.spec.js` (integración de overlays)

**Docs / OpenSpec**

- `docs/phase-3f-surface-inspection-integration.md`
- `docs/architecture.md`
- `docs/audit-product-navigation.md`
- `docs/uv-surface-mapping-diagnosis.md`
- `README.md`
- `SPEC.md`
- `openspec/roadmap.md`
- `openspec/specs/spatial-reference/spec.md`
- `openspec/changes/archive/2026-11-03-surface-inspection-integration/`

No se modificaron SurfaceMapping, Projection Source, ViewTransform, RenderScene,
geometría, teselación, frame, bbox ni exporters.

---

## 9. Limitaciones restantes

- Picking y overlays son solo Canvas single.
- Picking lineal sin BVH.
- Transparencia no modelada.
- Celda/seam pueden ser pequeños en mallas densas.
- Pin se libera al cambiar cámara/proyección.
- No se dibujan pares de seam ni orientación de twist.
- No hay exportación/serialización de inspección.
- Performance medida fuera del navegador; falta benchmark de playback denso.
- Seam overlay se reconstruye si cambia la firma completa de escena, aunque el
  cambio sea solo estilo/reference.

---

## 10. Conclusión

**Fase 3F: aprobada con limitaciones.**

La integración 3A–3E es coherente. Se corrigió el único bug P1 reproducible
(Spatial Reference invisible en perspectiva). Los overlays mantienen aislamiento
respecto de geometría, frame, bbox y exportaciones. No se añadieron
funcionalidades ni contratos nuevos.

No se avanzó a Quad picking, edición geométrica, UV unwrap, CAD ni fabricación.

---

## 11. Recomendación para la siguiente fase

Antes de nuevas capacidades:

- repetir el benchmark de picking/seams en navegador con playback denso;
- decidir si el seam overlay debe reconstruirse solo por cambios de
  topología/transform, no por estilo/reference;
- definir si se quiere un contrato futuro de pares de seam/twist orientation;
- mantener Canvas single como alcance hasta estabilizar la UX de inspección.
