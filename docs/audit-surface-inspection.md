# Auditoría — Fase 3C Surface Inspection

> **Estado:** auditoría de implementación, no una nueva funcionalidad.
>
> **Fecha:** 2026-11-03.
>
> **Commits auditados:** `a75aa3f` (implementación) y `a354862` (documentación).
>
> **Resultado final:** aprobada con limitaciones después de las correcciones
> listadas abajo.

---

## 1. Resumen ejecutivo

La implementación base de Surface Inspection era matemáticamente correcta en
los caminos principales: rayos perspectiva/ortográficos, intersección world,
UV por esquina, XYZ y oclusión. La auditoría encontró, sin embargo, errores de
integración y de tolerancia numérica que no estaban cubiertos por los tests
originales.

Se corrigieron:

- comparación inválida de distancias entre capas con frames independientes en
  `composition`;
- detección de Quad basada en el layout declarado en vez del estado real del
  renderer;
- rechazo de triángulos world muy pequeños por tolerancia absoluta;
- rechazo de distancias de intersección válidas muy pequeñas;
- estado `mapping ok` con UVs no finitas;
- falta de refresco del inspector al cambiar el viewport;
- churn de DOM durante playback/evaluaciones repetidas.

No se añadieron funcionalidades nuevas, picking Quad, edición, z-buffer ni
exportación de inspección.

---

## 2. Hallazgos

| ID | Severidad | Descripción | Reproducción | Causa | Solución | Estado |
|---|---|---|---|---|---|---|
| SI-A1 | P1 | En `composition`, capas con frames independientes comparaban distancias world de rayos distintos | Dos capas con transforms distintos y superficies solapadas; el resultado podía elegir una capa que no era la activa | `pickSurface` comparaba `t` de rayos no comparables | En `composition` se inspecciona solo la capa activa; sin `activeLayerId` el resultado es explícitamente nulo | Corregido |
| SI-A2 | P1 | El inspector usaba `view.layout === 'quad'` aunque el renderer podía estar en single (capa activa 2D) | Documento con layout quad y capa activa plana: el renderer dibuja single, el inspector decía `Single view only` | Estado declarado ≠ estado real del renderer | `P5Adapter.quadActive` + `onLayoutChange`; App e inspector consultan el estado real | Corregido |
| SI-A3 | P2 | Triángulos world pequeños se rechazaban como degenerados | Triángulo de lado `1e-6` con rayo normal: `intersectRayTriangle` devolvía `null` | Determinante comparado contra `1e-9` absoluto | Tolerancia relativa `1e-10 * scale` | Corregido |
| SI-A4 | P2 | Intersecciones válidas a distancia positiva muy pequeña se rechazaban | Triángulo a `0.5e-10` del origen del rayo | `t <= 1e-9` | `t <= 0` | Corregido |
| SI-A5 | P2 | Una mapping con UV no finitas podía reportar `mapping ok` | Mapping sintético con `u = NaN` | Solo se validaba presencia de mapping e índices | Chequeo de UV finitas; estado `mismatch` | Corregido |
| SI-A6 | P2 | El inspector no se refrescaba al redimensionar el canvas | Hover, resize del viewport, inspección obsoleta hasta mover el ratón | `fitToContainer` no notificaba al inspector | `onViewportChange` desde `fitToContainer` | Corregido |
| SI-A7 | P3 | Durante playback se reemplazaba el DOM del inspector cada frame | Activar Play con inspector visible | `setMessage` no cacheaba el mensaje | Cache de `lastMessage` | Corregido |
| SI-A8 | P3 | `composition` sin capa activa podía ser ambiguo | Llamada directa a `pickSurface` sin `activeLayerId` | No había política explícita | Devuelve `null` | Corregido |

---

## 3. Precisión matemática

### Rayos perspectiva

Se validaron cámaras con yaw/pitch variados y puntos world conocidos:

- el rayo reconstruido intersecta un plano world en el punto original;
- error máximo observado: `~1.6e-13` en la batería de 35 combinaciones
  yaw/pitch × 4 puntos;
- fov `50`, `320` y `1000` recuperan el mismo punto world;
- el rayo usa la cámara efectiva del `ViewTransform`, no una aproximación 2D.

### Rayos ortográficos

- XY: dirección `(0,0,-1)`, origen sobre `maxZ + margin`;
- XZ: dirección `(0,-1,0)`, origen sobre `maxY + margin`;
- YZ: dirección `(-1,0,0)`, origen sobre `maxX + margin`;
- el punto world recuperado coincide exactamente con el punto proyectado en las
  tres vistas;
- `orthoDepth` coincide con la convención de Projection Source:
  `-z`, `-y`, `-x`.

### Intersección

Se verificaron manualmente:

- centro de triángulo;
- borde;
- vértice;
- winding invertido;
- triángulo degenerado;
- triángulo con NaN;
- rayo paralelo;
- triángulo minúsculo;
- distancia positiva minúscula.

La intersección es doble cara y usa Möller–Trumbore. No se usa painter ordering.

### UV y XYZ

- UV se interpola con baricéntricas **world**;
- XYZ es el punto world de intersección, no una reconstrucción 2D;
- los dominios no normalizados e invertidos conservan sus valores reales;
- seams y twists conservan UVs por esquina;
- mapping ausente o malformado devuelve `uv: null` y estado explícito;
- el test de triángulo inclinado en perspectiva recupera UV y XYZ esperados con
  error `< 1e-7`.

---

## 4. Oclusión

- El hit más cercano gana en `scene`/`world`;
- se probaron dos mallas en órdenes opuestos y el resultado no cambió;
- se probaron superficies a distintas profundidades;
- en `composition` no se comparan distancias entre frames independientes:
  se inspecciona la capa activa;
- no se modela transparencia: una superficie transparente puede ocluir en el
  picking. Es una limitación conocida.
- empates exactos o superficies coplanares eligen de forma determinista la
  primera intersección encontrada.

---

## 5. UI y UX

Verificación visual manual:

- Torus en Canvas single con inspector activo: muestra surface, layer,
  triangle, cell, UV, XYZ, distancia y `mapping ok`.
- Quad con inspector activo: muestra `Single view only`.
- El panel es compacto, está sobre la telemetría y no captura pointer events.
- Estados sin hit, mapping missing y mapping mismatch son explícitos.
- La preferencia de activación persiste tras reload (test e2e).
- El inspector no aparece en SVG, plotter, PNG ni GIF.

Automatizado:

- toggle on/off;
- hover real con `page.mouse.move`;
- campos UV/XYZ/cell;
- estado sin superficie;
- Quad real;
- persistencia tras reload.

---

## 6. Rendimiento

Medición indicativa en Node local, grid plano sintético, 5 repeticiones por
tamaño, sin BVH y sin mapping:

| Triángulos | Tiempo medio de picking |
|---:|---:|
| 1.000 | 0,81 ms |
| 10.000 | 1,62 ms |
| 50.000 | 2,76 ms |
| 100.000 | 2,91 ms |

El coste es lineal y aceptable para la primera versión. No se justifica un BVH
todavía. La medición es indicativa y debe repetirse en el navegador objetivo con
superficies reales y mappings activos.

El render normal no ejecuta picking. El inspector solo actualiza cuando está
activo y el usuario interactúa o la geometría/cámara cambia.

---

## 7. Regresiones

Antes de las correcciones:

- `1871/1871` unit checks;
- `110/110` e2e;
- `73/73` specs.

Después de las correcciones:

- `1885/1885` unit checks;
- `111/111` e2e;
- `73/73` specs.

Se mantuvieron sin cambios:

- geometría;
- teselación;
- `SurfaceMapping`;
- `Projection Source`;
- `ViewTransform`;
- `RenderScene`;
- frame;
- bbox;
- canvas/quad render;
- SVG, PNG, GIF y plotter.

---

## 8. Limitaciones restantes

- Solo Canvas single; no hay picking Quad.
- Picking lineal; sin BVH.
- Transparencia no modelada.
- En `composition`, se inspecciona la capa activa.
- Empates/coplanaridad y bordes de seam pueden elegir un lado determinista.
- No hay reconstrucción de triángulos recortados por near-plane.
- No hay selección persistente ni edición.
- No hay exportación/serialización del resultado de inspección.
- La precisión numérica es buena en dobles, pero no se ha hecho un análisis
  formal de condicionamiento para geometría extrema.

---

## 9. Conclusión

**Fase 3C: aprobada con limitaciones.**

La funcionalidad cumple el criterio de aceptación para Canvas single:
inspección de superficie, triángulo, celda, UV, XYZ y profundidad, con
perspectiva/ortográfico, oclusión y mappings reales.

Las correcciones de auditoría eliminan los fallos P1/P2 encontrados. Las
limitaciones restantes están documentadas y no bloquean la inspección single.
No se avanzó a Quad picking, edición geométrica ni CAD.
