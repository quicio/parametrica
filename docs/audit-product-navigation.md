# Auditoría de navegación y responsabilidades — Parametrica

**Original:** 2026-11-01  
**Actualización de implementación:** 2026-11-02, tras `product-hardening`  
**Alcance de esta revisión:** actualizar el estado real de los hallazgos. No es
una nueva auditoría y no introduce funcionalidades ni cambios de código.

---

## 0. Resumen de la actualización

### Defectos resueltos

| Hallazgo original | Estado | Solución aplicada |
|---|---|---|
| Los passes `tangents` / `normals` / `curvature` por capa usaban el análisis combinado | **Resuelto** | `evaluateLayers` expone análisis lazy por capa; `P5Adapter` mapea el análisis de la capa que dibuja. Test unitario multicapa. |
| `style.blend` se exponía pero no se aplicaba | **Resuelto** | `P5Adapter` aplica el modo por capa y lo resetea antes de la siguiente capa/overlays. Test e2e de canvas. |

### Defectos parciales o resueltos con alcance

| Hallazgo original | Estado | Nota |
|---|---|---|
| `layer.locked` no impedía nada | **Parcial** | Se implementó **content lock**: bloquea generador, parámetros, ecuaciones/armónicos, operadores y estilo. Selección y visibilidad siguen disponibles. `rename`, `reorder`, `delete` y `duplicate` no se declaran bloqueados ni se modificaron. |
| Los render passes aparecían como activos aunque no aplicaran | **Resuelto con alcance** | Metadatos `appliesTo` en surface fill/wireframe, epicycles, control polygon y negative space; la UI los desactiva y recalcula tras cada evaluación. Passes sin metadata se asumen aplicables. |
| El SVG omitía features activas sin avisar | **Parcial** | `unsupportedSvgFeatures` detecta gradiente, surface fill, overlays, diagnósticos y blend; el export muestra un aviso. README/SPEC §17 documentan la limitación. La paridad SVG completa sigue pendiente. |

### Hallazgos que permanecen

- LOOK sigue concentrando demasiadas responsabilidades; la propuesta de
  reagrupación sigue pendiente de validación.
- `view.colorRamp` sigue sin editor.
- La paleta no define ni actualiza un ramp.
- `view.strokeWeight` sigue duplicando `style.stroke.width`.
- El renombrado de capa sigue sin UI.
- Notebook mantiene `notes`/`tags` sin editor.
- Explore randomiza con seed interno no visible.
- La exportación de frames sigue en Timeline.
- Status y telemetría siguen duplicando información.
- La lista de passes sigue sin agrupación/descripciones más allá de la
  aplicabilidad.
- `SPEC.md` §11 sigue desactualizado.
- La reorganización de LOOK y MAKE siguen fuera de alcance.
- No hay STL/3MF, sólidos editables, CSG ni viewport 3D.

---

## 1. Resumen ejecutivo

Parametrica mantiene cuatro modos (`FORM`, `LOOK`, `EXPLORE`, `KEEP`) y 19
secciones construidas de una vez y ocultas por modo.

La implementación `product-hardening` no cambió la navegación. Abordó cuatro
problemas de veracidad/corrección:

1. el análisis de diagnóstico ya es por capa;
2. `blend` ya tiene efecto;
3. los passes no aplicables se desactivan;
4. el export SVG avisa de lo que omite.

También introdujo un **content lock** explícito, que resuelve parcialmente el
hallazgo de `layer.locked`: bloquea la edición de contenido, pero no las
acciones estructurales/de identidad, que siguen siendo una decisión de producto.

Siguen abiertos los problemas de organización (LOOK), las mejoras UX
(colorRamp, cámara, fill, seed, metadata de Notebook), la deuda arquitectónica
(estilo global vs capa, stroke width duplicado, persistencia múltiple) y toda la
visión MAKE/fabricación.

---

## 2. Mapa actual de navegación

Sin cambios respecto a la auditoría original:

| Modo | Secciones |
|---|---|
| **FORM** | Layers, Generator, Parameters, Equations, Harmonics, Operators |
| **LOOK** | View, Artboard, Image, Animation, Timeline |
| **EXPLORE** | Mutation, Analysis, Advisor, Explore, Evolution |
| **KEEP** | Notebook, Presets, Export |

Estado de navegación:

- Modo y secciones abiertas se persisten en `parametrica.ui.v1`.
- Todas las secciones se construyen en cada `Controls.build()`.
- No hay routing, deep links ni historial de navegación.
- `Equations` y `Harmonics` son condicionales.
- El status del panel y la telemetría siguen duplicando información.

Cambios de comportamiento dentro del mapa actual:

- **View**: los toggles de render reflejan aplicabilidad y pueden desactivarse.
- **Artboard**: el estilo de la capa activa se desactiva bajo content lock.
- **Layers**: el botón de lock declara “Lock layer content”.

---

## 3. Inventario funcional — cambios de estado

El inventario original se conserva. Esta sección enumera solo las filas cuyo
estado cambió o que siguen siendo relevantes.

### FORM

| Funcionalidad | Estado anterior | Estado actual | Nota |
|---|---|---|---|
| Bloqueo de capa | Inactivo | **Parcial: content lock** | Bloquea generador, parámetros, ecuaciones/armónicos, operadores y estilo. No bloquea rename/reorder/delete/duplicate. |
| Renombrar capa | API sin UI | Sin cambios | Sigue sin control visible. |
| Undo/redo y seed | En Explore | Sin cambios | Siguen fuera de Form. |
| Operadores sobre superficies | No soportado | Sin cambios | `evaluateSurfaceDocument` sigue ignorando operadores. |
| `setGenerator` conserva operadores | Comportamiento existente | Sin cambios | No se abordó en hardening. |

### LOOK

| Funcionalidad | Estado anterior | Estado actual | Nota |
|---|---|---|---|
| Blend | Inactivo | **Implementado** | Aplicado por capa y reseteado; PNG lo refleja. |
| Toggles de render | Implementado, plano | **Implementado + aplicabilidad** | Los passes con `appliesTo` se desactivan cuando no aplican. Sigue sin agrupación/descripciones. |
| Diagnóstico por capa | Bug confirmado | **Resuelto** | Cada capa usa su propio análisis. |
| ColorRamp | Settings oculto | Sin cambios | Sigue sin editor. |
| Paleta/ramp | Desconectados | Sin cambios | La paleta no escribe `colorRamp`. |
| Fill | Sólido | Sin cambios | No hay gradientes ni modos nuevos. |
| Cámara | Sin reset | Sin cambios | Sin controles explícitos de viewport. |
| Image/Animation/Timeline | En Look | Sin cambios | La propuesta de moverlas sigue pendiente. |
| SVG export | Silencioso | **Divulgación añadida** | Avisa de features omitidas; no hay paridad completa. |

### EXPLORE

Sin cambios funcionales por `product-hardening`.

- Mutation sigue siendo one-shot en capa activa.
- Seed/reroll sigue en Mutation; Explore randomize sigue con seed interno.
- Analysis y Advisor siguen en Explore.
- Evolution sigue dependiendo de Notebook.
- Sensitivity sigue limitada a capa activa y hasta 12 parámetros.
- No hay historial persistente de candidatos.

### KEEP

| Funcionalidad | Estado anterior | Estado actual | Nota |
|---|---|---|---|
| Export SVG | Subconjunto silencioso | **Subconjunto con aviso** | `unsupportedSvgFeatures` informa de gradiente, surface fill, overlays, diagnósticos y blend. |
| Notebook notes/tags | Modelo sin UI | Sin cambios | Sigue sin editor. |
| Presets/Notebook | Dos bibliotecas | Sin cambios | No se unificaron ni relacionaron. |
| Frame export | En Timeline | Sin cambios | No se movió a Export. |
| Fabricación | Sin implementar | Sin cambios | Solo contratos. |

---

## 4. Diagnóstico de LOOK

### Responsabilidades que siguen concentradas

LOOK sigue conteniendo cámara, canvas, estilo, render, overlays, imagen,
animación y timeline. La reorganización Camera/Canvas/Style/Render/Overlays
sigue como propuesta pendiente, no implementada.

### Problemas resueltos o mitigados

- **Blend**: ya no es un control falso; se aplica por capa.
- **Passes inertes**: los passes con `appliesTo` se desactivan cuando no
  aplican. La UI se recalcula en cada evaluación.
- **Diagnóstico por capa**: los passes de vectores ya no leen el análisis
  combinado.
- **Divergencia silenciosa en SVG**: el export avisa de las features omitidas.

### Problemas que permanecen

- `view.colorRamp` sin editor.
- Paleta y ramp desconectados.
- Lista plana de passes, sin grupos ni descripciones.
- Fill limitado a sólido; sin gradientes.
- Cámara sin reset ni controles explícitos.
- Image/Animation/Timeline siguen en LOOK.
- Status y telemetría duplicados.
- `view.strokeWeight` duplicado.
- LOOK sigue siendo la sección más sobrecargada.
- El aviso SVG puede resultar ruidoso si hay muchos passes diagnósticos
  activos; es una nota UX, no un defecto funcional.

### Nuevos comportamientos detectados

- Al cambiar la geometría, un modo activo que deja de aplicar se elimina de
  `view.modes`; si vuelve a aplicar, el usuario debe reactivarlo.
- Bajo content lock, el selector de paleta se desactiva porque escribe estilo
  de capa, aunque también cambie el fondo. El fondo sigue siendo editable por
  su control específico.

---

## 5. Diagnóstico de FORM

FORM sigue siendo autoría + composición + transformación.

Cambios:

- **Content lock implementado** con alcance explícito:
  - bloquea generador, parámetros, ecuaciones/armónicos, operadores y estilo;
  - permite selección y visibilidad;
  - no bloquea rename, reorder, delete ni duplicate.
- La UI desactiva controles de generador, parámetros, mods, expresiones,
  armónicos, operadores y estilo cuando la capa activa está bloqueada.
- `App.setGenerator`, `addOperator`, `removeOperator`, `moveOperator` y
  `setOperatorEnabled` tienen guardas defensivas.

Problemas que permanecen:

- Renombrar capa sigue sin UI.
- El stack de operadores sigue siendo exclusivamente de curvas; las superficies
  ignoran operadores.
- `setGenerator` sigue conservando operadores y sobrescribiendo el nombre.
- Seed y undo/redo siguen en EXPLORE.
- No hay operadores de malla/sólido.

---

## 6. Diagnóstico de EXPLORE

Sin cambios por esta implementación.

Sigue mezclando:

1. mutación one-shot;
2. observación (métricas/sensibilidad);
3. advisor offline/LLM;
4. exploración paramétrica 1D/2D/morph/randomize;
5. evolución dependiente de Notebook.

Siguen pendientes:

- seed visible/reproducible en Explore;
- historial de candidatos;
- separación conceptual Observe/Ask;
- mover undo/redo/seed fuera de Explore;
- relación más clara entre Analysis y Notebook.

---

## 7. Diagnóstico de KEEP

Sin cambios estructurales.

Sigue conteniendo:

- **Notebook**: checkpoints, proyectos/series, thumbnails, linaje, A/B,
  restauración, import/export.
- **Presets**: catálogo built-in/user, favoritos, recientes, previews,
  import/export de documentos.
- **Export**: SVG, PNG, JSON, clipboard.

Cambios:

- **Export SVG** ahora declara las features que omite; ya no es silencioso.
- El resto de la lógica de presets/notebook no cambió.

Siguen pendientes:

- notas/tags editables;
- relación Notebook/Presets;
- frame export en Export;
- paridad SVG completa;
- export de fabricación.

---

## 8. Funcionalidades transversales

| Funcionalidad | Estado tras hardening | Nota |
|---|---|---|
| Cámara | Sin cambios | Sin reset ni controles explícitos; sigue en historial. |
| Proyección | Sin cambios | Global, gated por capa activa. |
| Viewport/canvas | Sin cambios | Runtime. |
| Artboard | Sin cambios | Global. |
| Imagen | Sin cambios | Underlay UI-only. |
| Export | Aviso añadido | SVG sigue siendo subconjunto; PNG fiel. |
| Animación/Timeline | Sin cambios | Siguen en LOOK. |
| Overlays | Sin cambios | Globales. |
| Presets | Sin cambios | Workspace. |
| Persistencia | Sin cambios | Múltiples stores. |
| Configuración global | Sin cambios | UI/AI settings. |
| Status/telemetría | Sin cambios | Siguen duplicando. |
| History | Sin cambios | Incluye cámara/estilo. |
| Seed | Sin cambios | Global, en Explore. |
| Analysis | Mejora indirecta | El análisis por capa ahora es correcto para diagnósticos. |
| Layer lock | **Nuevo content lock** | Alcance explícito de contenido. |
| Render passes | **Aplicabilidad** | Metadatos `appliesTo` + UI. |
| Blend | **Implementado** | Por capa, reset, PNG. |

---

## 9. Estado actual de MAKE

Sin cambios.

- No existe MAKE como sección, modo o workspace.
- Existen contratos Surface/Mesh/Solid, teselación, `meshToSolid`,
  `geometryExport` y validación de fabricación.
- No hay autoría de mallas/sólidos, operadores 3D, STL/3MF, unidades ni
  preparación de impresión.
- La visión de fabricación sigue en conflicto con el modelo curve-céntrico, el
  renderer p5 sin z-buffer/iluminación y la exportación artboard/curvas.

---

## 10. Conflictos con la visión futura

Sin cambios respecto a la auditoría original:

1. Documento curve-céntrico; superficies sin operadores.
2. Renderer p5 con painter ordering, sin inspección de sólidos.
3. Export artboard/curvas; sin fabricación.
4. Navegación Form/Look/Explore/Keep vs modos futuros del roadmap.
5. Estilo por capa pero render global.
6. Historial de documento completo (incluye cámara/estilo).
7. Persistencia múltiple.
8. Sin unidades ni tolerancias de fabricación.
9. Presupuestos de rendimiento orientados a puntos, no a mallas/sólidos.
10. MAKE no definido.

`product-hardening` no resuelve estos conflictos; solo mejora la veracidad y
corrección del estado actual.

---

## 11. Problemas y oportunidades

### 11.1 Problemas confirmados — estado actual

| Problema | Estado | Solución / nota |
|---|---|---|
| Análisis combinado en passes por capa | **Resuelto** | Análisis lazy por capa + mapeo en `P5Adapter`; test multicapa. |
| `style.blend` sin efecto | **Resuelto** | Blend por capa, reset, PNG; SVG lo declara omitido. |
| `layer.locked` sin efecto | **Parcial** | Content lock implementado; estructura/identidad pendiente. |
| Passes no aplicables activos | **Resuelto con alcance** | `appliesTo` + UI; passes sin metadata se asumen aplicables. |
| SVG omite features sin avisar | **Parcial** | Aviso implementado; paridad completa pendiente. |
| `view.colorRamp` sin UI | Pendiente | P1 UX. |
| `view.strokeWeight` duplicado | Pendiente | P2 arquitectura. |
| Paleta no actualiza ramp | Pendiente | P2 UX/expansión. |
| `renameLayer` sin UI | Pendiente | P2 UX. |
| Notebook notes/tags sin UI | Pendiente | P2 UX. |
| Explore seed interno | Pendiente | P1 UX. |
| Frame export en Timeline | Pendiente | P2 UX. |
| Status/telemetría duplicados | Pendiente | P2 UX. |
| `SPEC.md` §11 desactualizado | Pendiente | P2 docs. |
| LOOK sobrecargado | Pendiente | Propuesta pendiente de validación. |
| `setGenerator` conserva operadores | Sin cambios | Comportamiento existente, no abordado. |
| Superficies ignoran operadores | Sin cambios | Limitación estructural. |
| MAKE ausente | Sin cambios | Fuera de alcance. |

### 11.2 Problemas de UX

Siguen vigentes:

- LOOK sigue siendo un paraguas de cámara, canvas, estilo, render, imagen,
  animación y timeline.
- “Artboard” sigue mezclando canvas global y estilo de capa.
- Los passes siguen sin agrupación/descripciones; solo se añadió aplicabilidad.
- Fill sigue enterrado y limitado a sólido.
- Gradient Wireframe sigue sin editor de rampa.
- Cámara sin reset.
- Image/Animation/Timeline siguen en LOOK.
- Notebook y Presets siguen siendo dos bibliotecas sin relación explícita.
- Seed y undo/redo siguen en EXPLORE.
- Analysis/Advisor siguen en EXPLORE.
- Status/telemetría siguen duplicados.
- Copy sigue mezclando inglés y español.
- El content lock mejora la afordancia de lock, pero su alcance es solo
  contenido; las acciones estructurales siguen sin protección.

### 11.3 Problemas arquitectónicos

Siguen vigentes:

- `view.style` es alias del estilo de la capa activa.
- `view.modes` es global; el estilo es por capa.
- El pipeline de superficies salta operadores.
- Los passes hardcodean colores/grosores; no hay settings por pass.
- `P5Adapter` sigue leyendo el documento para animación/artboard/underlay.
- SVG y render p5 no comparten una descripción de escena completa.
- Múltiples stores de persistencia.
- Historial incluye cambios de vista.
- `view.strokeWeight` duplicado.

Mejora arquitectónica introducida:

- La aplicabilidad de passes ahora tiene metadata (`appliesTo`) y una única
  función de refresco (`refreshRenderModes`) que evita que la UI quede obsoleta.

---

## 12. Oportunidades de evolución

Se conservan las oportunidades originales. Cambios de énfasis:

- La metadata de `appliesTo` es una base natural para agrupar/describir passes
  y para settings por pass.
- El blend implementado valida el camino p5; `screen`/`difference` aún
  necesitan revisión visual.
- El content lock deja abierta la decisión de un lock estructural/identidad.
- La divulgación SVG permite posponer la paridad completa sin mentir al usuario.
- Siguen como oportunidades: colorRamp editor, paleta/ramp, cámara reset,
  seed visible, frame export, status/telemetry, layer rename, Notebook
  notes/tags, stroke width único, style model split, per-layer modes, SVG
  parity, Notebook/Presets relation, viewport history y MAKE.

---

## 13. Decisiones que requieren intervención del usuario

| Decisión | Estado actual | Qué falta |
|---|---|---|
| Alcance del layer lock | Content lock implementado | Decidir si rename/reorder/delete/duplicate deben incluirse. |
| Blend | Implementado y probado con `multiply` | Validar visualmente `screen`/`difference` y coste. |
| LOOK ownership | Propuesta Camera/Canvas/Style/Render/Overlays | Validación; decidir Image/Animation/Timeline. |
| Cámara/proyección: documento o viewport | Sin cambios | Definir si deben persistir/entrar en historial. |
| Estilo global vs por capa | Sin cambios | Definir si se separa `view.style` del estilo de capa. |
| Render modes globales vs por capa | Sin cambios | Definir. |
| Fill/ramp scope | Sin cambios | Definir global/capa/pass y relación paleta/ramp. |
| Notebook vs Presets | Sin cambios | Unificar, relacionar o mantener separados. |
| SVG parity | Aviso implementado | Decidir si se implementan gradientes/mallas/overlays. |
| Historial de viewport | Sin cambios | Decidir si cámara/estilo salen del undo/redo. |
| MAKE | Sin código | Definir primer vertical slice y salida real. |

---

## 14. Regresiones y problemas nuevos detectados durante la implementación

### Confirmados y mitigados

| Problema nuevo | Estado | Nota |
|---|---|---|
| La UI podía construir los toggles con una evaluación antigua al aplicar presets/cambiar geometría, dejando la aplicabilidad desactualizada | **Mitigado** | `App.evaluate()` llama a `Controls.refreshRenderModes()` después de evaluar; los toggles se recalculan. |
| Los modos activos que dejan de aplicar se eliminan de `view.modes` y no se restauran automáticamente | **Comportamiento nuevo intencional** | El usuario debe reactivar el pass si vuelve a aplicar. Es coherente con la veracidad, pero conviene documentarlo en la UI. |
| El content lock desactiva la paleta, que también cambia el fondo global | **Efecto lateral menor** | El fondo sigue editable desde su control específico; la paleta queda desactivada porque escribe estilo de capa. |

### Posibles, no confirmados

| Riesgo | Estado | Nota |
|---|---|---|
| `screen` / `difference` no se validaron visualmente más allá de `multiply` | Posible | Requiere revisión manual/visual. |
| `refreshRenderModes` se ejecuta en cada evaluación, incluido playback | Posible rendimiento | Las escrituras DOM están guardadas, pero no se midió en escenas grandes. |
| Solo algunos passes tienen `appliesTo`; el resto se asume aplicable | Limitación | Cubre los casos confirmados por la auditoría, no todos los futuros. |
| El content lock no cubre timeline, exploración, adopción de candidatos, presets ni restauración | Limitación documentada | El alcance es contenido editable; estos flujos siguen fuera del contrato. |
| El aviso SVG puede ser ruidoso con muchos passes diagnósticos activos | UX | No es un fallo; puede refinarse más adelante. |

No se detectaron regresiones funcionales en la suite: `npm run check`
(1580/1580), `npm run test:e2e` (82/82) y `openspec validate --specs --strict`
(53/53) pasan.
