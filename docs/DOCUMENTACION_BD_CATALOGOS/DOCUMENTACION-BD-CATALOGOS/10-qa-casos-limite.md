# Bloque 10 — QA y Casos Límite

**Proyecto:** Base de datos unificada de catálogos de artículos publicitarios
**Fecha:** 29 de mayo de 2026
**Estado:** ✅ Bloque final del proyecto. Consolida métricas, validaciones y compendio de casos límite documentados a lo largo de todos los bloques.
**Depende de:** Todos los bloques anteriores (1-9).
**Cierra el plan maestro:** 10/10 bloques completados.

> Este bloque define cómo validar que una carga (inicial o re-ingesta) salió correcta y compila en un solo lugar todos los casos límite documentados a lo largo del proyecto, con su decisión de manejo.

---

## 1. Filosofía de QA

Tres niveles de validación, cada uno más estricto:

| Nivel | Cuándo | Qué hace | Bloquea? |
|-------|--------|----------|----------|
| **Pre-merge** | Antes de tocar tablas vivas (en `staging`) | Sanity checks: counts, presencia de campos obligatorios, comparación con carga previa | Sí, si falla |
| **Post-merge** | Inmediatamente después de la carga | Validaciones de integridad referencial, coherencia de derivados, métricas vs esperado | Reporta; rollback opcional |
| **Continuo** | A diario / semanal | Detección de drift, métricas de búsqueda, productos huérfanos | No bloquea; alerta |

---

## 2. Validaciones pre-merge (sobre `staging`)

Ejecutar antes del Paso 5 del workflow de re-ingesta (Bloque 9 §4):

### 2.1 Sanity de cantidades

```sql
-- Esta carga vs. la anterior del mismo proveedor (% de cambio)
WITH actual AS (SELECT COUNT(*) AS n FROM staging_producto),
     previo AS (SELECT COUNT(*) AS n FROM producto WHERE proveedor_id = $1)
SELECT
  actual.n AS productos_archivo,
  previo.n AS productos_actuales,
  ROUND(100.0 * (actual.n - previo.n) / NULLIF(previo.n, 0), 1) AS porcentaje_cambio
FROM actual, previo;
```

**Reglas:**
- Cambio > +50%: probable error (proveedor pegó archivos). Detener.
- Cambio < -30%: probable archivo incompleto. Detener.
- Entre -30% y +50%: continuar.

### 2.2 Productos sin nombre o sin precio

```sql
-- Productos sin nombre (rechazo total: no se cargan)
SELECT COUNT(*) FROM staging_producto WHERE nombre IS NULL OR trim(nombre) = '';

-- Productos sin ninguna escala de precio (advertencia: pueden cargarse pero con flag)
SELECT s.codigo_proveedor, s.nombre
FROM staging_producto s
WHERE NOT EXISTS (SELECT 1 FROM staging_precio_escala e WHERE e.producto_id = s.id)
LIMIT 50;
```

Productos sin nombre se descartan (no se mergean). Productos sin precio sí entran pero con `precio_minimo_base = NULL`; en búsqueda aparecen al ordenar "consultar precio".

### 2.3 Variantes con stock inválido (texto, negativo)

```sql
-- En esta fase staging.stock ya debería estar limpio si el ETL siguió el Bloque 4.
-- Verificamos por si acaso:
SELECT COUNT(*) FROM staging_variante WHERE stock < 0;
SELECT COUNT(*) FROM staging_variante WHERE stock IS NULL;
```

Si el primero > 0: el ETL no aplicó correctamente la regla "negativo → 0 + log".

### 2.4 Categorías nuevas

```sql
-- ¿Aparecen nombres de categoría origen que NO están en categoria_mapeo?
SELECT DISTINCT nombre_origen_categoria
FROM staging_producto
WHERE NOT EXISTS (
  SELECT 1 FROM categoria_mapeo m
  WHERE m.proveedor_id = $1 AND m.nombre_origen = staging_producto.nombre_origen_categoria
);
```

Si la consulta devuelve filas: hay categorías nuevas. Decisión humana antes del merge:
- ¿Se mapean a una categoría canónica existente?
- ¿Es una categoría canónica nueva?

### 2.5 Colores nuevos

```sql
SELECT DISTINCT s.color
FROM staging_variante s
WHERE s.color IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM color_mapeo m WHERE upper(m.valor_crudo) = upper(s.color)
  );
```

Igual que categorías: revisar la lista; si son muchos, ampliar `color_mapeo`.

---

## 3. Validaciones post-merge

Ejecutar después del Paso 11 del workflow de re-ingesta (Bloque 9 §4):

### 3.1 Integridad referencial

```sql
-- Productos huérfanos (proveedor no existe — no debería pasar nunca)
SELECT COUNT(*) FROM producto p
LEFT JOIN proveedor pv ON pv.id = p.proveedor_id
WHERE pv.id IS NULL;

-- Variantes huérfanas
SELECT COUNT(*) FROM variante v
LEFT JOIN producto p ON p.id = v.producto_id
WHERE p.id IS NULL;

-- Precios huérfanos
SELECT COUNT(*) FROM precio_escala e
LEFT JOIN producto p ON p.id = e.producto_id
WHERE p.id IS NULL;
```

Las 3 queries deben devolver 0. Si no: hay un problema serio; restaurar backup.

### 3.2 Coherencia de derivados

```sql
-- producto.stock_total debe ser SUM(variante.stock) del producto
SELECT p.id, p.stock_total, COALESCE(SUM(v.stock), 0) AS suma_real
FROM producto p
LEFT JOIN variante v ON v.producto_id = p.id
WHERE p.proveedor_id = $1
GROUP BY p.id, p.stock_total
HAVING p.stock_total != COALESCE(SUM(v.stock), 0)
LIMIT 20;

-- producto.precio_minimo_base debe ser MIN(precio_escala.precio_base)
SELECT p.id, p.precio_minimo_base,
       (SELECT MIN(precio_base) FROM precio_escala e WHERE e.producto_id = p.id) AS minimo_real
FROM producto p
WHERE p.proveedor_id = $1
  AND p.precio_minimo_base IS DISTINCT FROM
      (SELECT MIN(precio_base) FROM precio_escala e WHERE e.producto_id = p.id)
LIMIT 20;
```

Si devuelve filas: el `recalcular_producto()` del Paso 11 no se ejecutó para todos los productos. Re-ejecutar.

### 3.3 Coherencia de IGV

```sql
-- precio_con_igv debe ser ~1.18 × precio_base (tolerancia 0.01 por redondeo)
SELECT e.id, e.precio_base, e.precio_con_igv,
       ROUND(e.precio_base * 1.18, 2) AS esperado
FROM precio_escala e
JOIN producto p ON p.id = e.producto_id
WHERE p.proveedor_id = $1
  AND ABS(e.precio_con_igv - ROUND(e.precio_base * 1.18, 2)) > 0.01
LIMIT 20;
```

Si devuelve filas: el ETL aplicó mal la regla de IGV del Bloque 4.

### 3.4 Productos en estado inconsistente

```sql
-- Productos descontinuados con stock > 0 (incoherencia)
SELECT id, nombre, stock_total
FROM producto
WHERE atributos @> '{"descontinuado":true}'::jsonb
  AND stock_total > 0
LIMIT 20;

-- Productos sin variantes (no debería existir)
SELECT p.id, p.nombre
FROM producto p
WHERE NOT EXISTS (SELECT 1 FROM variante v WHERE v.producto_id = p.id)
LIMIT 20;
```

### 3.5 Métricas vs esperado

Comparar contra lo que reportó `ingesta_log`:

```sql
-- ¿Lo que dice ingesta_log coincide con la realidad de la BD?
SELECT
  l.archivo,
  l.productos_creados + l.productos_actualizados AS productos_segun_log,
  (SELECT COUNT(*) FROM producto p
   WHERE p.proveedor_id = l.proveedor_id
     AND p.actualizado_en > l.inicio) AS productos_segun_bd
FROM ingesta_log l
WHERE l.id = $log_id;
```

Si difieren > 5%: el ETL contó mal alguna parte. Revisar el código del proveedor en cuestión.

---

## 4. Validaciones continuas (a correr cada semana / mes)

### 4.1 Productos sin imagen
```sql
SELECT p.id, p.proveedor_id, p.nombre
FROM producto p
WHERE NOT EXISTS (SELECT 1 FROM imagen i WHERE i.producto_id = p.id)
  AND COALESCE((p.atributos->>'descontinuado')::boolean, false) = false
GROUP BY p.proveedor_id
ORDER BY COUNT(*) DESC;
```

Si el % sube respecto al mes anterior: el ETL está fallando la extracción de imágenes en algún formato.

### 4.2 Candidatos a duplicado sin revisar
```sql
SELECT COUNT(*)
FROM dedup_candidato
WHERE estado = 'pendiente'
  AND revisado_en IS NULL;
```

Si crece sin atender: hay trabajo manual pendiente.

### 4.3 Drift de búsquedas
Si se registran logs de búsqueda en la app (recomendado), monitorear:
- Búsquedas con 0 resultados (sugerencia: agregar sinónimo si la palabra existe en el catálogo con otro nombre).
- Búsquedas con typos frecuentes que el trigrama no rescata (umbral demasiado alto).
- Tiempo de respuesta p95.

### 4.4 Productos descontinuados que reaparecen
```sql
-- Productos que tienen flag "descontinuado" pero su stock está siendo actualizado
-- (Probablemente el flag debería quitarse)
SELECT id, nombre
FROM producto
WHERE atributos @> '{"descontinuado":true}'::jsonb
  AND stock_total > 0
  AND actualizado_en > NOW() - INTERVAL '7 days';
```

---

## 5. Compendio de casos límite (de todos los bloques)

Tabla maestra de todos los casos especiales detectados y su decisión de manejo:

| # | Caso | Origen | Decisión |
|---|------|--------|----------|
| 1 | Precio "CONSULTAR PRECIO" | Promoprime (1 caso) | `precio_unitario = NULL`, texto guardado en `etiqueta_origen`. |
| 2 | "CONSULTAR OBSERVACIONES" / "CONSULTAR RESTRICCIONES" | Hojas Promos | Son **encabezados de columna**, no valores. ETL los detecta por estar en fila-encabezado. |
| 3 | Precio con comas: `S/11,000.0` | Cheaper, Tienda Publi | Quitar coma; `numeric(10,2)` aguanta. |
| 4 | Precio con sufijo "INCLUIDO IGV" | Tienda Publi (551 celdas) | Quitar sufijo; aplicar `precio_base = publicado / 1.18`. |
| 5 | Stock negativo | Cheaper (2 casos: -5 a -1) | Guardar 0 + registrar original en `ingesta_log.errores`. |
| 6 | Stock como texto: "DISPONIBLE EN ALMACENES" | Company PDF | `stock = NULL` + guardar texto en `variante.atributos.stock_estado`. NO entra al filtro "en stock". |
| 7 | Stock con coma: "37,639" | Varios | Quitar coma. |
| 8 | Stock en tránsito como texto: "FECHA ESTIMADA 28/02/2026" | Promoprime | Parsear fecha → `fecha_transito`; cantidad → `stock_en_transito` (o NULL si no aparece). |
| 9 | Hoja "Datos Empresa" en Cheaper | Cheaper | Saltar entera; antes extraer `fecha_catalogo` de fila 1. |
| 10 | Filas de título "STOCK CLIENTES" + fecha (filas 1-2) | EFStock (19 hojas) | Saltar filas 1-2 de cada hoja; encabezado real en fila 3. |
| 11 | Banda de categoría sin datos: "ESCRITORIO" | Promoprime | Detectar por: única celda con texto que coincide con nombre de categoría. Ignorar. |
| 12 | Encabezado de columna repetido al inicio de cada banda | Promoprime | Detectar por contenido idéntico al encabezado conocido. Ignorar. |
| 13 | Producto sin código (nombre en DESCRIPCION) | Tienda Publi | Generar clave: `codigo_proveedor = 'tp_' + slug(nombre)`. |
| 14 | Producto multifila (cabecera + filas de descripción + variantes) | Tienda Publi | Algoritmo de bloques: stock+color+precio = cabecera/variante; sin esos = descripción. |
| 15 | Una imagen "REMATON!!!" / "OFERTA!!!" como texto | Promos hojas Ofertas y REMATES! | NO tratar como imagen; producto sin imagen propia (se intenta reusar la del producto original por dedup). |
| 16 | Columna COLOR contiene valores numéricos (precios) | Promos hojas regulares | Localizar columnas POR encabezado, NO por índice. Validar que el valor no sea numérico antes de tratarlo como color. |
| 17 | Código del producto embebido en `ARTÍCULO` (sin columna CÓDIGO SISTEMA) | Promos hoja "Ofertas" (1055 filas) | Extraer con regex `^([A-Z]+-\d+)\s`. |
| 18 | Color dentro de DESCRIPCION (sin columna COLOR) | Promos hoja "Ofertas" | Intentar match contra `color_mapeo`; si falla, `color = NULL`. |
| 19 | Múltiples colores en una sola fila (separados por coma) | Promoprime | Crear N variantes; asignar stock total a la primera, 0 a las demás. |
| 20 | Stock del producto entero, no por color | Promoprime | Variante "principal" con stock total. Documentar en `producto.observaciones`. |
| 21 | Color "VARIOS", "NATURAL", "NUDE", "BAMBOO" | Varios | NO son sinónimos de otro color; se conservan como base propio en tabla `color`. |
| 22 | Typo "TURQUEZA" en lugar de "TURQUESA" | Cheaper | Mapeo en `color_mapeo`: `TURQUEZA → turquesa`. |
| 23 | Sinónimos cruzados: PLATEADO / PLATA / SILVER | Múltiples | Todos → `color_base = 'plateado'`. |
| 24 | Sinónimos cruzados: GRIS / PLOMO / GUN | Múltiples | Todos → `color_base = 'gris'`. |
| 25 | Productos con misma identidad entre proveedores | Multi-proveedor | Detección por niveles: alta confianza (mismo código) → merge automático; media (nombre similar + categoría) → `dedup_candidato` para revisión. |
| 26 | Productos descontinuados en re-ingesta | Re-ingesta | Marcar `atributos.descontinuado = true` + `stock_total = 0`. NO borrar. |
| 27 | Variantes que desaparecen en re-ingesta | Re-ingesta | `stock = 0`. NO borrar. |
| 28 | Tienda Publi renombra un producto | Re-ingesta | Crea NUEVO + DESCONTINUADO. Revisar similitud trigrama post-merge para detectar renames probables. |
| 29 | Re-cargar el mismo archivo dos veces | Idempotencia | Sin efecto (upsert + delete-insert de escalas son idempotentes; MD5 evita reinsertar imágenes). |
| 30 | PDF de Company falla parsing en algunas filas | Company | Tasa de error aceptable ~10%; registrar fallos en `ingesta_log.errores`; las imágenes que no se asocien quedan sin producto vinculado. |

---

## 6. Métricas de salud del sistema (panel sugerido)

Métricas que conviene exponer en un dashboard simple:

| Métrica | Cálculo | Salud |
|---------|---------|-------|
| Total productos activos | `COUNT(*) WHERE NOT descontinuado` | Esperado: 5,000-10,000 |
| % productos con imagen | `COUNT(imagen) / COUNT(producto)` | > 80% |
| % productos con precio | `COUNT(precio_minimo_base IS NOT NULL) / COUNT(*)` | > 95% |
| % productos en stock | `COUNT(stock_total > 0) / COUNT(*)` | Variable, baseline propia |
| Productos por proveedor | `GROUP BY proveedor_id` | Distribución balanceada |
| Productos sin producto_maestro | `WHERE producto_maestro_id IS NULL` | Debería ser 0 (todo debe tener al menos un maestro de sí mismo) |
| Candidatos dedup pendientes | `dedup_candidato WHERE estado='pendiente'` | Tendencia a la baja |
| Errores en última ingesta | `ingesta_log` última fila | < 5% de filas leídas |
| Tiempo búsqueda p95 | Logs de app | < 100 ms |

---

## 7. Plan de pruebas (smoke tests)

Conjunto mínimo de búsquedas que deben funcionar después de cada carga grande:

| Test | Query | Resultado esperado |
|------|-------|---------------------|
| 1. Búsqueda directa | "tomatodo" | Al menos 20 resultados |
| 2. Sinónimo | "botella" | Devuelve también tomatodos (sinónimo activo) |
| 3. Typo | "tomatdo" | Devuelve tomatodos (trigrama) |
| 4. Sin tildes | "tecnologia" | Devuelve resultados de "Tecnología" |
| 5. Mayúsculas | "MUG" y "mug" | Mismos resultados |
| 6. Filtro categoría | "lapicero" + categoría = Lapiceros | Solo lapiceros |
| 7. Filtro precio | precio_minimo_base ≤ 2 | Solo productos económicos |
| 8. Filtro stock | stock_total > 0 | Solo en stock |
| 9. Combinación | "azul" + stock > 0 + Tomatodos | Resultados intersectados |
| 10. Producto maestro | Producto en varios proveedores | Un solo resultado con N ofertas |
| 11. Autocompletado | "tom" | < 50 ms, devuelve "tomatodo…" |
| 12. Toggle IGV | Cambiar toggle | precio_minimo cambia según corresponda |

Documentar estos tests en un script SQL y correr después de cada re-ingesta importante.

---

## 8. Checklist final de QA

Para cada carga (inicial o re-ingesta):

1. ✅ **Pre-merge:** counts vs anterior, sin productos vacíos, categorías/colores nuevos revisados.
2. ✅ **Post-merge:** integridad referencial OK, derivados coherentes, IGV correcto, sin productos huérfanos.
3. ✅ **Smoke tests:** 12 búsquedas del §7 funcionan.
4. ✅ **Métricas dashboard:** todos los indicadores en rango saludable.
5. ✅ **Log de errores:** revisado; errores < 5% de filas; los críticos atendidos.
6. ✅ **Dedup pendiente:** revisar nuevos candidatos en `dedup_candidato`.

---

## 9. Cierre del plan maestro

Con este bloque cierran los 10 bloques del plan maestro. Resumen final de los documentos:

| Bloque | Archivo en Drive | Cubre |
|--------|------------------|-------|
| 0 | `00-plan-maestro.md` | Hoja de ruta del proyecto |
| 1 | `01-resumen-comparativo-fuentes-FINAL.md` | Análisis de los 7 catálogos origen |
| 2 | `02-diccionario-datos.md` | Campos canónicos del modelo destino |
| 3 | `03-esquema-ddl-v2.md` + `03-esquema-ddl-v2.sql` | Esquema PostgreSQL ejecutable |
| 4 | `04-reglas-negocio-v2.md` | IGV, precios, stock, escalas, hojas no-producto |
| 5 | `05-mapeo-etl-por-proveedor.md` | Receta ETL por cada uno de los 7 catálogos |
| 6 | `06-vocabularios-deduplicacion.md` | Normalización de colores, categorías, deduplicación |
| 7 | `07-busqueda-rendimiento.md` | Configuración FTS, sinónimos, autocompletado, queries SQL |
| 8 | `08-manejo-imagenes.md` | Extracción, almacenamiento y uso de imágenes |
| 9 | `09-re-ingesta-manual.md` | Proceso de actualización periódica |
| 10 | `10-qa-casos-limite.md` (este) | Validaciones, métricas y compendio de casos límite |

El diseño está completo y listo para implementar.

---

*Documento del Bloque 10 — QA y compendio de casos límite. Cierra el plan maestro del proyecto. Los 10 bloques están en tu carpeta `DOCUMENTACION-BD-CATALOGOS/` de Google Drive.*