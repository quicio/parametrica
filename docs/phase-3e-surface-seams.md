# Fase 3E — Surface Seams & Twists Visualization

> **Estado:** implementado.
>
> **Fecha:** 2026-11-03.
>
> **Base:** SurfaceMapping (3A), Projection Source (3B), Surface Inspection
> (3C/3D).
>
> **Naturaleza:** visualización UI-only derivada. No modifica geometría,
> teselación, SurfaceMapping, Projection Source, ViewTransform, RenderScene,
> frame, bbox ni exportadores.

---

## 1. Semántica visual

La visualización distingue tres conceptos que no son equivalentes:

| Elemento | Significado | Representación |
|---|---|---|
| **Borde de dominio** | Borde de un eje **abierto** (`closedU/V = false`) | Línea gris sólida |
| **Seam declarado** | Identificación paramétrica de un eje **cerrado** (`closedU/V = true`) | Línea roja discontinua |
| **Seam reverse / twist** | Seam cerrado con `seamU/V = 'reverse'` | Línea roja punteada + leyenda `twist` |

### Reglas

1. Un seam **no** es un borde UV: es la identificación declarada de un eje
   cerrado.
2. Un borde de dominio es el final real de un eje abierto.
3. En un eje cerrado se dibuja **una** línea de seam en el extremo lógico
   `u1`/`v1`; `u0`/`v0` es su identificación, no un borde separado.
4. En un eje abierto se dibujan ambos extremos: `u0/u1` o `v0/v1`.
5. Un seam reverse se dibuja con estilo punteado y la leyenda `twist`. No se
   dibujan flechas ni emparejamientos que sugieran una orientación no
   demostrada.
6. **No se afirma continuidad geométrica.** `closed` es una declaración
   paramétrica/topológica. La malla está soldada y el mapping no conserva el
   grid original completo como para demostrar que no hay crack o discontinuidad
   geométrica. El estado de la leyenda es `declared`, no `continuous`.
7. Dominios invertidos conservan sus extremos lógicos `u0/u1` y `v0/v1`; no se
   reordenan a min/max.
8. Si el mapping falta, es inválido o la superficie es degenerada, no se
   inventan seams. La leyenda muestra `mapping unavailable` o `partial data`.

### Leyenda

- `── border`: borde de dominio abierto.
- `- - seam`: seam declarado normal.
- `··· twist`: seam reverse/twist.
- Estado:
  - `declared seams`: al menos un seam declarado;
  - `borders only`: solo bordes abiertos;
  - `partial data`: algunas caras no se pudieron interpretar;
  - `no visible seams`: mapping válido sin bordes/seams visibles;
  - `mapping unavailable`: sin mapping utilizable.

---

## 2. Datos utilizados

Solo se reutiliza información existente:

- `SurfaceMapping.domain.u/v`;
- `closedU/V`;
- `seamU/V`;
- `twistU/V`;
- `SurfaceMapping.faces[].indices`;
- `SurfaceMapping.faces[].uv`;
- `SurfaceMapping.faces[].cell`;
- `Mesh` world vertices/faces;
- transforms de `RenderScene`.

No se introduce ninguna nueva geometría ni contrato espacial.

---

## 3. Implementación

### `src/interaction/seamOverlay.js`

`buildSeamOverlay({ evaluation, scene })`:

- recorre capas visibles con meshes y mappings;
- verifica que el mapping sea utilizable;
- recorre las caras del mapping;
- clasifica cada arista por sus dos UVs:
  - `border-u0/u1/v0/v1` si el eje está abierto;
  - `seam-u/v` si el eje está cerrado;
  - `seam-u/v-twist` si está cerrado y reverse;
- deduplica aristas por mesh + índices + tipo;
- proyecta ambos vértices world a artboard;
- devuelve `{ status, edges, seams, borders }`.

No usa painter ordering. No infiere continuidad.

### Render

`P5Adapter.drawSeamOverlay`:

- solo Canvas single;
- después de la geometría y antes del overlay de inspección;
- recortado al artboard;
- bordes grises sólidos;
- seams rojos discontinuos;
- twists rojos punteados;
- cacheado por `scene` en un `WeakMap`;
- desactivado en `captureMode`, por lo que no entra en PNG/GIF/SVG/plotter.

### UI

`SeamLegend`:

- toggle **Seams** en Look → Canvas;
- leyenda compacta en la parte inferior central;
- muestra estado y estilos;
- oculta en Quad;
- persistencia UI-only local;
- no captura pointer events.

La visualización es independiente de Surface Inspector y de su pin. Puede
coexistir con hover, pin, UV Domain y Spatial Reference.

---

## 4. Archivos

**Nuevos**

- `src/interaction/seamOverlay.js`
- `src/ui/SeamLegend.js`
- `docs/phase-3e-surface-seams.md`

**Modificados**

- `src/application/App.js`
- `src/ui/Controls.js`
- `src/render/p5/P5Adapter.js`
- `style.css`
- `test/lab.smoke.mjs`
- `e2e/surface.spec.js`
- documentación y OpenSpec.

No se modificaron contratos geométricos.

---

## 5. Pruebas

Unitarias:

- dominio abierto → cuatro tipos de borde;
- U cerrado → seam U, sin duplicar bordes U;
- V cerrado → seam V;
- ambos cerrados → ambos seams, sin bordes;
- reverse U/V → twist;
- dominio invertido → bordes lógicos correctos;
- mapping missing → unavailable;
- mapping malformado → partial, sin aristas inválidas;
- dominio zero-span → unavailable;
- perspectiva → seams proyectados finitos;
- no mutación de evaluación/mapping.

E2E:

- toggle y leyenda;
- canvas cambia con overlay;
- PNG del artboard sin seams;
- Quad oculta la leyenda;
- vuelta a single;
- cambio a documento 2D → `mapping unavailable`;
- desactivación oculta la leyenda.

---

## 6. Validación

- `npm run check`: lint, **1922/1922** checks y build.
- `npm run test:e2e`: **114/114** tests.
- `openspec validate --specs --strict`: **73/73** specs.
- Verificación visual manual:
  - Torus cerrado: seams rojos discontinuos;
  - Hyperbolic Saddle abierto: bordes;
  - leyenda `SEAMS` visible;
  - Quad sin leyenda.

---

## 7. Limitaciones

- No se puede demostrar continuidad geométrica desde el mapping.
- No se dibujan emparejamientos de vértices del seam ni orientación del twist;
  solo se marca el tipo.
- En mallas densas los bordes pueden quedar parcialmente ocultos por el
  wireframe.
- La celda/seam puede ser visualmente pequeña; la leyenda aclara el estado.
- Solo Canvas single.
- No hay picking, edición, unwrap, CAD ni exportación de seams.
- Un mapping parcial muestra `partial data`, no una reconstrucción completa.

---

## 8. Recomendación para la siguiente fase

Si se quiere representar la **correspondencia exacta** de un seam reverse
(vértice A ↔ vértice B), haría falta un contrato explícito de pares de seam o
conservar el grid lógico original con suficiente información. Eso ya no sería
solo visual y requeriría justificar un nuevo contrato.

Antes de eso, la visualización actual debe considerarse suficiente para
exploración: muestra dónde están los bordes, qué ejes son cerrados y qué seams
son reverse/twist, sin afirmar continuidad ni orientación no demostrada.

No avanzar a Quad picking, edición UV, CAD ni fabricación sin una nueva fase.
