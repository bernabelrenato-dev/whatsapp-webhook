# Bloque 9 — Re-ingesta Manual

**Proyecto:** Base de datos unificada de catálogos de artículos publicitarios
**Fecha:** 29 de mayo de 2026
**Estado:** ✅ Diseño completo del proceso de actualización periódica.
**Depende de:** Bloques 3 (Esquema), 4 (Reglas), 5 (Mapeo ETL), 8 (Imágenes).
**Alimenta a:** Bloque 10 (QA — métricas a validar tras cada re-ingesta).

> Los catálogos llegan periódicamente (decisión del usuario). Este bloque diseña el proceso para recargar un catálogo nuevo sin perder datos, sin duplicar productos y manteniendo trazabilidad. NO se automatiza por ahora (acordado): es un proceso manual repetible.

---

## 1. Principios

Las reglas que guían el diseño de re-ingesta:

1. **Upsert por código natural.** Nunca borrar y volver a insertar; siempre actualizar el registro existente. Esto preserva los `id` internos, las relaciones (`producto_maestro_id`, agrupaciones de dedup) y las decisiones humanas previas (revisión manual de dedup).
2. **No borrar lo que el nuevo archivo no trae.** Un catálogo parcial o un error del proveedor no debe destruir datos. Si un producto desaparece, se marca como descontinuado, no se borra.
3. **Solo el último valor (sin historial).** No guardamos versiones anteriores de precio/stock. Si en el futuro se necesita auditoría histórica, se añade una tabla `producto_historial`.
4. **Cada proveedor es independiente.** Recargar Chiper no afecta los datos de EFStock.
5. **Idempotencia.** Ejecutar la re-ingesta dos veces con el mismo archivo produce el mismo resultado (no duplica nada).
6. **Trazabilidad completa.** Cada carga deja un registro en `ingesta_log` con métricas (filas leídas, productos creados/actualizados, errores).

---

## 2. Clave natural por proveedor (para el upsert)

El upsert necesita una clave estable que identifique inequívocamente al producto entre cargas:

| Proveedor | Clave natural | Razón |
|-----------|---------------|-------|
| Chiper (CHEAPER/CHIPER) | `(proveedor_id, codigo_proveedor)` | `codigo_proveedor` es estable. |
| EFStock | `(proveedor_id, codigo_proveedor)` | Idem. |
| Promoprime | `(proveedor_id, codigo_proveedor)` | Idem. |
| Promos | `(proveedor_id, codigo_proveedor)` a nivel producto; `codigo_sistema_variante` a nivel variante | El código de sistema (`PD…`) es único por variante. |
| **Tienda Publi** | `(proveedor_id, codigo_proveedor)` donde `codigo_proveedor = 'tp_<slug>'` (generado del nombre) | No tiene código propio; lo generamos en el ETL (Bloque 5 §2.3). |
| Company (PDF) | `(proveedor_id, codigo_proveedor)` | Tiene código propio. |

El esquema ya impone `UNIQUE (proveedor_id, codigo_proveedor)` en `producto`, lo que garantiza unicidad y permite `INSERT … ON CONFLICT DO UPDATE`.

### 2.1 Tienda Publi: caso del nombre que cambia
Si el proveedor renombra "BOTELLA TORRENOSTRA" a "BOTELLA TORRE NOSTRA", el slug cambia (`tp_botella_torrenostra` → `tp_botella_torre_nostra`), y el ETL crearía un producto nuevo y dejaría el antiguo huérfano. **Mitigación:** después de cada re-ingesta, ejecutar una revisión manual de productos de Tienda Publi creados+descontinuados en la misma carga (probable rename). Documentado en §6.

---

## 3. Estados del producto en la re-ingesta

Cada producto del proveedor cae en uno de estos 4 estados al comparar la carga nueva contra el estado actual de la BD:

| Estado | Descripción | Acción |
|--------|-------------|--------|
| **NUEVO** | Está en el archivo nuevo, no en BD. | INSERT producto + variantes + precios + imagen. |
| **ACTUALIZADO** | Está en ambos, con cambios (precio, stock, descripción, etc.). | UPDATE de los campos cambiados. |
| **SIN CAMBIOS** | Está en ambos, idéntico. | No-op (registro inocuo en log). |
| **DESCONTINUADO** | Está en BD, no en el archivo nuevo. | Marcar `producto.atributos.descontinuado = true` y `stock_total = 0`. NO borrar. |

### 3.1 Cómo se detecta cada estado

```sql
-- Asumiendo tabla temporal `staging_producto` con los productos del archivo nuevo
-- de un proveedor específico (proveedor_id = $1)

-- NUEVOS: están en staging pero no en producto
SELECT s.codigo_proveedor
FROM staging_producto s
WHERE NOT EXISTS (
  SELECT 1 FROM producto p
  WHERE p.proveedor_id = $1 AND p.codigo_proveedor = s.codigo_proveedor
);

-- DESCONTINUADOS: están en producto pero no en staging
SELECT p.id, p.codigo_proveedor
FROM producto p
WHERE p.proveedor_id = $1
  AND NOT EXISTS (
    SELECT 1 FROM staging_producto s
    WHERE s.codigo_proveedor = p.codigo_proveedor
  )
  AND COALESCE((p.atributos->>'descontinuado')::boolean, false) = false;

-- ACTUALIZADOS / SIN CAMBIOS: existen en ambos; el upsert decide qué cambió
```

---

## 4. Proceso paso a paso (workflow manual)

Cuando llega un catálogo nuevo (ej. un EFSTOCK.xlsx del mes siguiente):

### Paso 1 — Backup
```bash
pg_dump --schema=public --data-only -t producto -t variante -t precio_escala -t imagen \
        catalogos > backup_pre_reingesta_$(date +%Y%m%d).sql
```

Si la re-ingesta sale mal, hay vuelta atrás.

### Paso 2 — Cargar archivo a `staging`
Tablas temporales con la misma estructura que las definitivas, sin constraints, prefijo `staging_`. El ETL del Bloque 5 escribe primero ahí. Esto permite validar antes de tocar los datos vivos.

```sql
CREATE TEMP TABLE staging_producto (LIKE producto INCLUDING ALL);
CREATE TEMP TABLE staging_variante (LIKE variante INCLUDING ALL);
CREATE TEMP TABLE staging_precio_escala (LIKE precio_escala INCLUDING ALL);
-- … etc
```

El ETL llena estas tablas exactamente como llenaría las definitivas en una carga inicial. Hasta aquí no hay riesgo.

### Paso 3 — Validar staging (QA pre-merge)
```sql
-- ¿Cuántos productos trae el archivo?
SELECT COUNT(*) FROM staging_producto;

-- ¿Hay productos sin nombre o sin precio?
SELECT COUNT(*) FROM staging_producto WHERE nombre IS NULL OR nombre = '';
SELECT COUNT(*) FROM staging_producto p
WHERE NOT EXISTS (SELECT 1 FROM staging_precio_escala e WHERE e.producto_id = p.id);

-- ¿Coincide aproximadamente con la carga anterior (±20%)?
SELECT
  (SELECT COUNT(*) FROM staging_producto) AS nuevos,
  (SELECT COUNT(*) FROM producto WHERE proveedor_id = $1) AS actuales;
```

Si la diferencia es > 20% (perdimos o ganamos demasiados productos respecto a la última carga), **detener** y revisar el archivo manualmente antes de continuar.

### Paso 4 — Detectar descontinuados
```sql
-- Lista de productos que estaban y ya no están
SELECT p.id, p.codigo_proveedor, p.nombre, p.stock_total
FROM producto p
WHERE p.proveedor_id = $1
  AND NOT EXISTS (
    SELECT 1 FROM staging_producto s
    WHERE s.codigo_proveedor = p.codigo_proveedor
  )
  AND COALESCE((p.atributos->>'descontinuado')::boolean, false) = false;
```

Si la lista es sospechosamente grande (ej. > 30% del total del proveedor), **detener**: es probable que el nuevo archivo esté incompleto. Confirmar con el proveedor antes de seguir.

### Paso 5 — Merge (upsert) de productos
```sql
INSERT INTO producto (
  proveedor_id, categoria_id, codigo_proveedor, codigo_sistema,
  nombre, descripcion, tipo_impresion, presentacion, observaciones, atributos
)
SELECT
  proveedor_id, categoria_id, codigo_proveedor, codigo_sistema,
  nombre, descripcion, tipo_impresion, presentacion, observaciones, atributos
FROM staging_producto
ON CONFLICT (proveedor_id, codigo_proveedor) DO UPDATE SET
  categoria_id = EXCLUDED.categoria_id,
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  tipo_impresion = EXCLUDED.tipo_impresion,
  presentacion = EXCLUDED.presentacion,
  observaciones = EXCLUDED.observaciones,
  -- atributos: merge (no sobreescribir todo)
  atributos = producto.atributos || EXCLUDED.atributos,
  -- NO actualizar: producto_maestro_id (decisión humana previa)
  -- NO actualizar: creado_en
  actualizado_en = NOW();
```

### Paso 6 — Merge de variantes
Las variantes (`variante`) se manejan en 3 pasos:

```sql
-- 6.1 Upsert: variantes que están en ambos
INSERT INTO variante (producto_id, color, color_id, acabado, stock, stock_en_transito, fecha_transito, codigo_sistema_variante)
SELECT v.producto_id, v.color, v.color_id, v.acabado, v.stock, v.stock_en_transito, v.fecha_transito, v.codigo_sistema_variante
FROM staging_variante v
ON CONFLICT (producto_id, color) DO UPDATE SET
  stock = EXCLUDED.stock,
  stock_en_transito = EXCLUDED.stock_en_transito,
  fecha_transito = EXCLUDED.fecha_transito,
  color_id = EXCLUDED.color_id,
  acabado = EXCLUDED.acabado;

-- 6.2 Variantes que estaban y ya no están: stock = 0 (no borrar)
UPDATE variante v
SET stock = 0, stock_en_transito = 0
WHERE v.producto_id IN (SELECT id FROM producto WHERE proveedor_id = $1)
  AND NOT EXISTS (
    SELECT 1 FROM staging_variante sv
    WHERE sv.producto_id = v.producto_id AND sv.color = v.color
  );
```

### Paso 7 — Merge de precios
Los precios cambian más seguido que el resto, y un precio "viejo" no tiene valor si el proveedor ya no lo ofrece. Estrategia: **borrar y reinsertar las escalas** (a diferencia de producto y variante).

```sql
-- 7.1 Borrar escalas viejas de los productos del proveedor
DELETE FROM precio_escala pe
WHERE pe.producto_id IN (SELECT id FROM producto WHERE proveedor_id = $1);

-- 7.2 Insertar las nuevas
INSERT INTO precio_escala (producto_id, cantidad_minima, precio_base, precio_con_igv, etiqueta_origen)
SELECT producto_id, cantidad_minima, precio_base, precio_con_igv, etiqueta_origen
FROM staging_precio_escala;
```

Excepción: para productos con `CONSULTAR PRECIO` (que llegan con `precio_base = NULL` filtrado en la carga), el ETL no inserta escala. Si el nuevo archivo trae precio, sí se inserta.

### Paso 8 — Marcar descontinuados
```sql
UPDATE producto p
SET
  atributos = p.atributos || '{"descontinuado": true, "descontinuado_en": "' || NOW()::date || '"}'::jsonb,
  stock_total = 0,
  actualizado_en = NOW()
WHERE p.proveedor_id = $1
  AND NOT EXISTS (
    SELECT 1 FROM staging_producto s
    WHERE s.codigo_proveedor = p.codigo_proveedor
  )
  AND COALESCE((p.atributos->>'descontinuado')::boolean, false) = false;
```

### Paso 9 — Marcar "re-incorporados"
Productos que estaban descontinuados y ahora vuelven a aparecer:
```sql
UPDATE producto p
SET
  atributos = p.atributos - 'descontinuado' - 'descontinuado_en',
  actualizado_en = NOW()
WHERE p.proveedor_id = $1
  AND COALESCE((p.atributos->>'descontinuado')::boolean, false) = true
  AND EXISTS (
    SELECT 1 FROM staging_producto s
    WHERE s.codigo_proveedor = p.codigo_proveedor
  );
```

### Paso 10 — Imágenes (con la lógica del Bloque 8 §8)
Por cada imagen del staging:
- Si el producto tenía imagen y el MD5 coincide → no hacer nada.
- Si el MD5 difiere → reemplazar archivo y actualizar `imagen.ruta`.
- Si el producto no tenía → crear registro y archivo.
- Si el producto tenía y el nuevo no trae → **mantener la imagen antigua** (no borrar).

### Paso 11 — Recalcular campos derivados
```sql
-- Recalcular todos los productos del proveedor (después del merge)
SELECT recalcular_producto(p.id)
FROM producto p
WHERE p.proveedor_id = $1;
```

(La función `recalcular_producto` se definió en el Bloque 7 §3.2.)

### Paso 12 — Registrar la carga
```sql
INSERT INTO ingesta_log (
  proveedor_id, archivo, inicio, fin,
  filas_leidas, productos_creados, productos_actualizados, variantes_creadas,
  errores, estado
) VALUES (
  $1, 'EFSTOCK.xlsx', $inicio, NOW(),
  $filas_leidas, $creados, $actualizados, $variantes,
  $errores_jsonb, 'completado'
);
```

### Paso 13 — QA post-merge (Bloque 10)
Validaciones automáticas: totales coinciden, no hay productos sin precio en estado activo, no se rompió ninguna FK, etc. Detalle en Bloque 10.

### Paso 14 — Decisión de rollback (si algo falló)
Si el QA del Paso 13 detecta problemas mayores:
```bash
psql catalogos < backup_pre_reingesta_<fecha>.sql
```

Si todo OK, archivar el backup y limpiar.

---

## 5. Casos especiales

### 5.1 Producto cambia de categoría
El proveedor reclasifica "Lapicero metálico premium" de `LAPICEROS METALICOS` a `SETS EJECUTIVOS`. El upsert actualiza `categoria_id`, lo cual está bien — pero **rompe la agrupación de `producto_maestro` previa** si los maestros se formaron por categoría. Mitigación:
- El paso 5 (upsert producto) NO modifica `producto_maestro_id`. Si la categoría cambia, el producto sigue agrupado donde estaba.
- Después del merge, un job opcional revisa coherencia `producto.categoria_id` vs `producto_maestro.categoria_id` y marca discrepancias en `dedup_candidato` para revisión humana.

### 5.2 Variante de color desaparece
Si una variante AZUL ya no está en el nuevo archivo (sigue habiendo otras: ROJO, NEGRO), el paso 6.2 le pone `stock = 0`. **No se borra** porque puede volver en cargas futuras y queremos preservar el `variante.id` para historial de pedidos (futuro).

### 5.3 Cambia el código del producto
Caso raro pero posible: el proveedor cambia `TC-105` por `TC-105B`. El upsert lo trata como NUEVO + DESCONTINUADO (uno se crea, el otro se marca descontinuado). Mitigación:
- Después del merge, revisar productos descontinuados del proveedor en esta carga. Si tienen nombre/descripción muy similar a un producto NUEVO (similitud trigrama > 0.85), candidato a "rename" → unir manualmente.
- Esto se agrega como una nueva categoría a `dedup_candidato.razon = 'rename_probable'`.

### 5.4 Re-cargar el mismo archivo dos veces
Por idempotencia (principio §1.5), ejecutar el mismo workflow con el mismo archivo no debe duplicar nada. El upsert garantiza esto en producto y variante. El paso 7 (borrar e insertar precios) también es idempotente. La única operación con riesgo es la imagen: comparar por MD5 evita reinsertar si nada cambió.

### 5.5 Re-ingesta de Tienda Publi (sin código natural)
La clave generada `tp_<slug>` se basa en el nombre. Si el proveedor cambia el nombre del producto, el slug cambia y el upsert no encuentra match → NUEVO + DESCONTINUADO. Acción:
- Después de cada re-ingesta de Tienda Publi, listar productos NUEVOS + DESCONTINUADOS en la misma carga.
- Comparar por similitud trigrama de nombre.
- Si la similitud > 0.85 → probable rename, candidato manual.

```sql
WITH cambios AS (
  SELECT id, nombre, atributos
  FROM producto
  WHERE proveedor_id = (SELECT id FROM proveedor WHERE nombre = 'Tienda Publi')
    AND actualizado_en > NOW() - INTERVAL '1 hour'
)
SELECT a.id AS a_id, a.nombre AS a_nombre, b.id AS b_id, b.nombre AS b_nombre,
       similarity(lower(a.nombre), lower(b.nombre)) AS sim
FROM cambios a, cambios b
WHERE a.id < b.id
  AND COALESCE((a.atributos->>'descontinuado')::boolean, false) != COALESCE((b.atributos->>'descontinuado')::boolean, false)
  AND similarity(lower(a.nombre), lower(b.nombre)) > 0.85;
```

---

## 6. Frecuencia recomendada de re-ingesta

| Proveedor | Frecuencia razonable |
|-----------|----------------------|
| Chiper (CHEAPER/CHIPER) | Mensual (su catálogo tiene fecha mensual) |
| EFStock | Quincenal (declara fecha en cabecera) |
| Promos | Semanal o quincenal (alta rotación con "Ofertas" cambiantes) |
| Promoprime | Mensual |
| Tienda Publi | Mensual (es pesado de procesar) |
| Company (PDF) | Cuando llegue nuevo PDF (sin frecuencia fija) |

No hace falta hacerlas todas a la vez: cada proveedor se actualiza independientemente.

---

## 7. Lo que NO se hace (decisiones explícitas)

- ❌ **No se guarda historial de precios.** Si el precio cambió, el anterior se pierde. Si en el futuro se necesita auditoría histórica, se añade una tabla `precio_historial` con append-only.
- ❌ **No se borra ningún producto físicamente.** Solo se marca `descontinuado = true` en `atributos`. Permite recuperar y mantener integridad referencial.
- ❌ **No hay automatización (decisión del usuario).** El workflow es manual y documentado. Se puede automatizar más adelante como un cron job que ejecute los pasos 2-12 con un archivo dado.
- ❌ **No se reagrupa `producto_maestro` automáticamente.** Las agrupaciones de dedup son decisión humana (Bloque 6); la re-ingesta las preserva.

---

## 8. Checklist de re-ingesta

Para cada catálogo nuevo:

1. ✅ Backup de tablas críticas con `pg_dump`.
2. ✅ Cargar archivo a tablas `staging_*`.
3. ✅ Validar staging (counts, productos sin nombre/precio, diferencia ±20%).
4. ✅ Detectar descontinuados; si > 30% del total, detener y revisar.
5. ✅ Upsert producto (preservando `producto_maestro_id` y `creado_en`).
6. ✅ Upsert variantes; variantes desaparecidas → `stock = 0`.
7. ✅ Borrar e insertar precios (idempotente).
8. ✅ Marcar productos descontinuados.
9. ✅ Marcar re-incorporados.
10. ✅ Procesar imágenes (MD5 → reemplazar o mantener).
11. ✅ Recalcular campos derivados con `recalcular_producto()`.
12. ✅ Insertar registro en `ingesta_log`.
13. ✅ QA post-merge (Bloque 10).
14. ✅ Si todo OK, archivar backup; si falló, restaurar.
15. ✅ Para Tienda Publi: revisar lista de "rename probable".

---

*Documento del Bloque 9 — proceso de re-ingesta manual completo y repetible. Idempotente, sin pérdida de datos, con rollback. Listo para automatizar más adelante si crece el volumen.*