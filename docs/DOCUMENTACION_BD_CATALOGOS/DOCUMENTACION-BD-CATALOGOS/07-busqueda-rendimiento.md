# Bloque 7 — Estrategia de Búsqueda y Rendimiento

**Proyecto:** Base de datos unificada de catálogos de artículos publicitarios
**Fecha:** 29 de mayo de 2026
**Estado:** ✅ Diseño técnico completo con SQL concreto y ejemplos de query.
**Depende de:** Bloque 3 (esquema con tsvector, índices GIN), Bloque 6 (vocabularios canónicos).
**Alimenta a:** la implementación de la capa de búsqueda en la app.

> Este bloque define el corazón del proyecto: cómo encontrar productos rápido. Cubre configuración de PostgreSQL FTS, sinónimos del dominio, tolerancia a typos, autocompletado, filtros, ranking y agrupamiento por producto_maestro.

---

## 1. Objetivos y métricas

El sistema debe cumplir:

| Métrica | Objetivo |
|---------|----------|
| Búsqueda de texto libre | **< 100 ms** en el percentil 95, con 10,000 productos |
| Autocompletado (sugerencias mientras se escribe) | **< 50 ms** |
| Búsqueda con filtros (categoría + precio + stock) | **< 150 ms** |
| Tolerancia a 1-2 typos | "tomatdo" encuentra "tomatodo" |
| Sinónimos del dominio | "tomatodo" encuentra "botella", "cilindro" |
| Sin tildes | "tecnologia" encuentra "tecnología" |
| Insensible a mayúsculas | "AZUL" y "azul" son lo mismo |
| Resultados sin duplicados | un solo resultado por producto_maestro |

A 10,000 productos PostgreSQL con índices GIN trabaja holgado. Cuando se acerquen los 50,000 o requieras autocompletado < 20 ms, evaluar Meilisearch/Typesense (ver §11).

---

## 2. Configuración de PostgreSQL

### 2.1 Extensiones (ya las declara el DDL del Bloque 3)
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- trigramas (similitud + LIKE eficiente)
CREATE EXTENSION IF NOT EXISTS unaccent;    -- quitar tildes
```

### 2.2 Configuración FTS en español + unaccent
PostgreSQL trae `spanish` pero no le aplica `unaccent` por defecto. Creamos una configuración propia:

```sql
-- Una sola vez, como superuser o owner de la BD
CREATE TEXT SEARCH CONFIGURATION es_unaccent (COPY = spanish);

ALTER TEXT SEARCH CONFIGURATION es_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, spanish_stem;
```

A partir de aquí, `to_tsvector('es_unaccent', 'lapicero azúl')` produce los mismos lexemas que `to_tsvector('es_unaccent', 'lapicero azul')`.

### 2.3 Sinónimos del dominio
PostgreSQL permite un diccionario `synonym` que aplica antes del stemming. Creamos el archivo `/usr/share/postgresql/<ver>/tsearch_data/promos.syn`:

```
tomatodo      botella
tomatodo      cilindro
botella       tomatodo
cilindro      tomatodo
mug           taza
mug           jarro
taza          mug
jarro         mug
lapicero      boligrafo
lapicero      pluma
lapicero      pen
usb           pendrive
usb           memoria
pendrive      usb
memoria       usb
llavero       keychain
mochila       morral
audifono      auricular
auricular     audifono
parlante      altavoz
altavoz       parlante
```

Y se integra a la configuración:

```sql
CREATE TEXT SEARCH DICTIONARY promos_syn (
  TEMPLATE = synonym,
  SYNONYMS = promos
);

ALTER TEXT SEARCH CONFIGURATION es_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH promos_syn, unaccent, spanish_stem;
```

> El orden importa: primero sinónimos (reemplazan el token), luego unaccent (limpia tildes), luego stem (raíz). Si el sinónimo no aplica, los tokens caen por defecto a unaccent + stem.

### 2.4 Configuración recomendada de Postgres
- `shared_buffers` ≥ 25% de la RAM (BD pequeña → no es crítico, pero ayuda).
- `work_mem` ≥ 16 MB (para que los sorts de búsqueda quepan en memoria).
- `random_page_cost = 1.1` (si está en SSD, que es lo normal hoy).

---

## 3. Mantenimiento de los campos derivados

El esquema (Bloque 3) tiene 4 campos derivados en `producto`. Definimos cómo se llenan y se mantienen:

| Campo | Cálculo | Cuándo se actualiza |
|-------|---------|----------------------|
| `nombre_normalizado` | `lower(unaccent(nombre))` | Al insertar/actualizar el producto |
| `texto_busqueda` (tsvector) | `to_tsvector('es_unaccent', nombre \|\| ' ' \|\| coalesce(descripcion,'') \|\| ' ' \|\| categoria.nombre_canonico \|\| ' ' \|\| string_agg(variante.color,' '))` | Al insertar/actualizar producto, variante o cambiar categoría |
| `stock_total` | `SUM(variante.stock)` por producto | Cuando cambia stock de cualquier variante |
| `precio_minimo_base` | `MIN(precio_escala.precio_base)` | Cuando cambia algún precio del producto |
| `precio_minimo_con_igv` | `MIN(precio_escala.precio_con_igv)` | Idem |

### 3.1 Triggers vs. ETL
Dos enfoques posibles:
- **Triggers en BD:** garantizan consistencia automática. Más lentos en cargas masivas.
- **Mantenimiento por el ETL:** el ETL los recalcula al final de cada carga. Más rápido, pero hay que acordarse de hacerlo.

**Recomendación:** combinación.
1. Durante la carga inicial del ETL (volumen alto): NO usar triggers. El ETL inserta todo y al final corre un `UPDATE` masivo.
2. Después de la carga inicial: activar triggers para que cambios manuales (corrección de un producto, actualización de stock) los mantengan automáticamente.

### 3.2 Función de recálculo (para usar tanto en ETL como en triggers)

```sql
CREATE OR REPLACE FUNCTION recalcular_producto(p_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE producto p
  SET
    nombre_normalizado = lower(unaccent(p.nombre)),
    stock_total = COALESCE((SELECT SUM(v.stock) FROM variante v WHERE v.producto_id = p_id), 0),
    precio_minimo_base = (SELECT MIN(e.precio_base) FROM precio_escala e WHERE e.producto_id = p_id),
    precio_minimo_con_igv = (SELECT MIN(e.precio_con_igv) FROM precio_escala e WHERE e.producto_id = p_id),
    texto_busqueda = to_tsvector('es_unaccent',
      coalesce(p.nombre,'') || ' ' ||
      coalesce(p.descripcion,'') || ' ' ||
      coalesce((SELECT c.nombre_canonico FROM categoria c WHERE c.id = p.categoria_id),'') || ' ' ||
      coalesce((SELECT string_agg(v.color,' ') FROM variante v WHERE v.producto_id = p_id),'')
    ),
    actualizado_en = NOW()
  WHERE p.id = p_id;
END;
$$ LANGUAGE plpgsql;
```

### 3.3 Triggers (activar tras carga inicial)

```sql
-- Cuando cambia stock de una variante → recalcular su producto
CREATE OR REPLACE FUNCTION trg_variante_after_change() RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalcular_producto(COALESCE(NEW.producto_id, OLD.producto_id));
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_variante_aiud
  AFTER INSERT OR UPDATE OR DELETE ON variante
  FOR EACH ROW EXECUTE FUNCTION trg_variante_after_change();

-- Cuando cambia un precio → recalcular su producto
CREATE OR REPLACE FUNCTION trg_precio_after_change() RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalcular_producto(COALESCE(NEW.producto_id, OLD.producto_id));
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_precio_aiud
  AFTER INSERT OR UPDATE OR DELETE ON precio_escala
  FOR EACH ROW EXECUTE FUNCTION trg_precio_after_change();

-- Cuando cambia el producto mismo → recalcular
CREATE OR REPLACE FUNCTION trg_producto_after_change() RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalcular_producto(NEW.id);
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_producto_aiu
  AFTER INSERT OR UPDATE OF nombre, descripcion, categoria_id ON producto
  FOR EACH ROW EXECUTE FUNCTION trg_producto_after_change();
```

---

## 4. Patrón de query principal

### 4.1 Query base de búsqueda agrupada por producto_maestro

```sql
-- Búsqueda: "lapicero azul retractil", filtros categoría + en stock + precio máx
WITH busqueda AS (
  SELECT
    p.id,
    p.producto_maestro_id,
    p.proveedor_id,
    p.nombre,
    p.precio_minimo_base,
    p.precio_minimo_con_igv,
    p.stock_total,
    -- Score de relevancia: FTS pesa más que similitud por trigramas
    (ts_rank(p.texto_busqueda, to_tsquery('es_unaccent', 'lapicero & azul & retractil')) * 2.0
     + similarity(p.nombre_normalizado, 'lapicero azul retractil')) AS score
  FROM producto p
  WHERE
    -- Texto: full-text OR similitud por trigramas (uno u otro debe matchear)
    (p.texto_busqueda @@ to_tsquery('es_unaccent', 'lapicero & azul & retractil')
     OR p.nombre_normalizado %% 'lapicero azul retractil')
    -- Filtros
    AND p.categoria_id = 7                    -- lapiceros
    AND p.stock_total > 0                     -- solo en stock
    AND p.precio_minimo_base <= 5.00          -- toggle "sin IGV" + máx S/5
)
SELECT
  pm.id AS producto_maestro_id,
  pm.nombre_canonico,
  -- Mejor oferta agrupada
  MIN(b.precio_minimo_base) AS mejor_precio_base,
  MIN(b.precio_minimo_con_igv) AS mejor_precio_con_igv,
  SUM(b.stock_total) AS stock_combinado,
  -- Lista de ofertas (proveedores que lo venden)
  json_agg(json_build_object(
    'producto_id', b.id,
    'proveedor_id', b.proveedor_id,
    'precio_base', b.precio_minimo_base,
    'precio_con_igv', b.precio_minimo_con_igv,
    'stock', b.stock_total
  ) ORDER BY b.precio_minimo_base ASC) AS ofertas,
  MAX(b.score) AS score
FROM busqueda b
JOIN producto_maestro pm ON pm.id = b.producto_maestro_id
GROUP BY pm.id, pm.nombre_canonico
ORDER BY score DESC, mejor_precio_base ASC
LIMIT 20 OFFSET 0;
```

Este patrón:
- Busca por texto (FTS + trigramas).
- Aplica filtros.
- Calcula el score combinando FTS (peso 2) + similitud trigrama (peso 1).
- Agrupa por `producto_maestro_id`.
- Devuelve la **mejor oferta** + un JSON con todas las ofertas, ordenadas por precio.

### 4.2 Generador de tsquery seguro
Las queries `to_tsquery` no toleran espacios; hay que tokenizar y unir con `&`. PostgreSQL ofrece `plainto_tsquery` y `websearch_to_tsquery` (más permisivo):

```sql
-- Más permisivo y tolerante al usuario
websearch_to_tsquery('es_unaccent', 'lapicero azul retractil')
-- equivalente a: 'lapicero & azul & retractil'

-- Soporta también frases y exclusiones:
-- "lapicero azul" -ecologico    -> frase exacta + exclusión
```

**Recomendación: usar `websearch_to_tsquery`** en la app, es lo más cercano a Google-style.

---

## 5. Tolerancia a typos (trigramas)

El operador `%` (similitud) y `%%` (similitud difusa) de `pg_trgm` permiten matches con typos:

```sql
SELECT nombre, similarity(nombre_normalizado, 'tomatdo') AS sim
FROM producto
WHERE nombre_normalizado %% 'tomatdo'
ORDER BY sim DESC
LIMIT 10;
```

- Umbral por defecto: 0.3 (configurable con `SET pg_trgm.similarity_threshold = 0.25;`).
- Sirve para typos cortos (1-2 caracteres) y para nombres parciales.
- **Combinar con FTS:** FTS es preciso para frases bien escritas; trigramas rescatan los typos. La query del §4.1 usa ambos con `OR`.

---

## 6. Autocompletado

### 6.1 Estrategia
A medida que el usuario escribe, mostrar 5-8 sugerencias:
1. Coincidencias por prefijo en `nombre_normalizado` (rapidísimo con `pg_trgm` + GIN).
2. Si no hay suficientes, completar con coincidencias por similitud trigrama.

### 6.2 Query de autocompletado

```sql
-- Usuario escribe "tom"
WITH prefijo AS (
  SELECT
    p.producto_maestro_id,
    pm.nombre_canonico,
    p.precio_minimo_base,
    0 AS orden,
    1.0 AS rank
  FROM producto p
  JOIN producto_maestro pm ON pm.id = p.producto_maestro_id
  WHERE p.nombre_normalizado LIKE 'tom%'
    AND p.stock_total > 0
  LIMIT 8
),
similares AS (
  SELECT
    p.producto_maestro_id,
    pm.nombre_canonico,
    p.precio_minimo_base,
    1 AS orden,
    similarity(p.nombre_normalizado, 'tom') AS rank
  FROM producto p
  JOIN producto_maestro pm ON pm.id = p.producto_maestro_id
  WHERE p.nombre_normalizado %% 'tom'
    AND p.stock_total > 0
    AND NOT EXISTS (SELECT 1 FROM prefijo pr WHERE pr.producto_maestro_id = p.producto_maestro_id)
  ORDER BY rank DESC
  LIMIT 8
)
SELECT DISTINCT ON (producto_maestro_id) producto_maestro_id, nombre_canonico, precio_minimo_base
FROM (SELECT * FROM prefijo UNION ALL SELECT * FROM similares) t
ORDER BY producto_maestro_id, orden ASC, rank DESC
LIMIT 8;
```

`LIKE 'tom%'` con índice `gin_trgm_ops` es rapidísimo en PostgreSQL (mucho más que con btree para prefijos).

### 6.3 Cache del autocompletado
Como las consultas más populares son palabras cortas frecuentes ("tom", "lap", "mug"), conviene cachearlas en memoria (Redis o caché de la app) por 5-10 minutos.

---

## 7. Filtros combinables

Todos los filtros son AND y se aplican a la CTE `busqueda`:

| Filtro | Cláusula SQL | Índice que aprovecha |
|--------|--------------|----------------------|
| Por categoría | `p.categoria_id = $1` | `idx_producto_categoria` |
| Por proveedor | `p.proveedor_id = $1` | `idx_producto_proveedor` |
| Solo en stock | `p.stock_total > 0` | `idx_producto_stock_total` (parcial) |
| Precio máximo (sin IGV) | `p.precio_minimo_base <= $1` | `idx_producto_precio_minimo_base` |
| Precio máximo (con IGV) | `p.precio_minimo_con_igv <= $1` | `idx_producto_precio_minimo_con_igv` |
| Por color base | `EXISTS (SELECT 1 FROM variante v WHERE v.producto_id = p.id AND v.color_id = $1 AND v.stock > 0)` | `idx_variante_color` + `idx_variante_producto` |
| Con tipo de impresión | `p.tipo_impresion ILIKE '%serigrafia%'` | tabla pequeña, scan rápido |
| Por oferta (remate/promo) | `p.atributos @> '{"oferta":"remate"}'::jsonb` | `idx_producto_atributos` (GIN jsonb) |

### 7.1 Filtro por color (consideración)
El filtro por color requiere `JOIN variante`. Para evitarlo en queries frecuentes, una optimización futura sería **denormalizar** el array de colores base en `producto`:

```sql
ALTER TABLE producto ADD COLUMN colores_base INTEGER[];
CREATE INDEX idx_producto_colores_base ON producto USING GIN (colores_base);
```

Y mantenerlo desde el trigger de variante. Permite query: `... AND $color_id = ANY(p.colores_base)` sin JOIN. **No necesario al inicio**; agregar si los filtros por color son frecuentes y lentos.

---

## 8. Agrupamiento por producto_maestro y "ofertas"

Cada `producto_maestro` agrupa productos equivalentes de varios proveedores. La búsqueda debe devolver UN resultado por maestro, con las ofertas desplegables.

### 8.1 Cómo se muestra al usuario
```
─────────────────────────────────────────────────
TOMATODO PLASTICO 750ml         [imagen 200x200]
Mejor precio: S/ 3.80 (≥500 und, sin IGV)
─────────────────────────────────────────────────
  3 ofertas:
  ✓ Promos       S/ 3.80   stock: 14,565   [▾]
  ✓ EFStock      S/ 4.20   stock: 8,200    [▾]
  ✓ Tienda Publi S/ 5.80   stock: 1,500    [▾]
─────────────────────────────────────────────────
```

### 8.2 Comparación de ofertas
Al expandir, mostrar para cada proveedor:
- Precio sin IGV / con IGV (según toggle).
- Stock por variante (color).
- Imagen de esa oferta (si difiere).
- Tiempo de entrega (si está en `producto.atributos`).

---

## 9. Toggle "sin IGV / con IGV"

Persistente en la sesión del usuario (cookie o setting).

| Estado del toggle | Columna usada para ordenar/filtrar | Columna mostrada |
|-------------------|--------------------------------------|-------------------|
| **SIN IGV** (default) | `precio_minimo_base` | `precio_base` de la escala que aplique |
| CON IGV | `precio_minimo_con_igv` | `precio_con_igv` |

Cambiar el toggle re-ejecuta la query con la columna correspondiente. La query del §4.1 ya trae ambos campos, así que la app solo debe decidir cuál renderizar. Si el orden por precio está activo, sí se re-ejecuta la query con el `ORDER BY` actualizado.

---

## 10. Paginación

### 10.1 OFFSET/LIMIT (al inicio)
A 10,000 productos, `LIMIT 20 OFFSET 0..200` es perfectamente performante. Para los primeros ~10 páginas, OFFSET es trivial.

### 10.2 Keyset pagination (para futuras escalas)
Cuando se acerquen 50,000+ productos, OFFSET en páginas profundas (offset 1000+) empieza a doler. Migrar a keyset:

```sql
-- Página 1
WHERE ... ORDER BY score DESC, id ASC LIMIT 20;

-- Página 2 (recibe el último score+id de la 1)
WHERE ... AND (score, id) < ($score_anterior, $id_anterior)
ORDER BY score DESC, id ASC LIMIT 20;
```

**No necesario al inicio.**

---

## 11. Cuándo migrar a Meilisearch / Typesense

PostgreSQL FTS + pg_trgm sirven holgadamente al volumen actual. Señales para migrar a un motor de búsqueda dedicado:

| Señal | Acción |
|-------|--------|
| Autocompletado pasa de 50 ms con BD vacía de cache | Cachear en Redis (más simple que migrar). |
| Búsqueda total pasa de 200 ms en p95 con 30k+ productos | Pasar el índice de búsqueda a Meilisearch/Typesense; PostgreSQL queda como BD de verdad. |
| Necesidad de "did you mean…?" más sofisticada que pg_trgm | Algolia o Typesense ofrecen mejor UX. |
| > 5,000 búsquedas/min sostenidas | Motor dedicado escala mejor. |

**Estrategia de migración futura:** los motores externos consumen el mismo modelo: cada producto_maestro con sus campos planos. El esquema actual NO se rehace; solo se exporta a Meilisearch/Typesense via ETL incremental.

---

## 12. Ejemplos de queries listos para copiar

### 12.1 Búsqueda simple por texto + categoría
```sql
SELECT p.id, p.nombre, p.precio_minimo_base
FROM producto p
WHERE p.texto_busqueda @@ websearch_to_tsquery('es_unaccent', 'mug ceramica blanca')
  AND p.categoria_id = (SELECT id FROM categoria WHERE nombre_canonico = 'Mugs y termos')
ORDER BY ts_rank(p.texto_busqueda, websearch_to_tsquery('es_unaccent', 'mug ceramica blanca')) DESC
LIMIT 20;
```

### 12.2 "Did you mean…?" (sugerencia de corrección)
```sql
-- Si la query original no devolvió resultados:
SELECT word, similarity(word, 'tomatdo') AS sim
FROM ts_stat('SELECT texto_busqueda FROM producto')
WHERE word %% 'tomatdo'
ORDER BY sim DESC
LIMIT 3;
-- Devuelve: tomatodo, tomate, lomatado…
```

### 12.3 Búsqueda por color base
```sql
SELECT DISTINCT p.id, p.nombre
FROM producto p
JOIN variante v ON v.producto_id = p.id
JOIN color c ON c.id = v.color_id
WHERE c.nombre_base = 'azul'
  AND v.stock > 0
ORDER BY p.precio_minimo_base ASC
LIMIT 20;
```

### 12.4 Top productos por categoría (homepage)
```sql
SELECT p.nombre, p.precio_minimo_base, p.stock_total
FROM producto p
WHERE p.categoria_id = $1
  AND p.stock_total > 0
ORDER BY p.stock_total DESC, p.precio_minimo_base ASC
LIMIT 12;
```

### 12.5 Ofertas activas (atributos JSONB)
```sql
SELECT p.id, p.nombre, p.precio_minimo_base
FROM producto p
WHERE p.atributos @> '{"oferta":"remate"}'::jsonb
  AND p.stock_total > 0
ORDER BY p.precio_minimo_base ASC
LIMIT 20;
```

---

## 13. Checklist de implementación

1. ✅ Crear extensiones `pg_trgm` y `unaccent`.
2. ✅ Crear configuración FTS `es_unaccent` con unaccent + spanish_stem.
3. ✅ Crear archivo de sinónimos `promos.syn` y diccionario `promos_syn`; añadir a la config FTS.
4. ✅ Implementar función `recalcular_producto(p_id)` (§3.2).
5. ✅ Durante carga inicial: NO usar triggers; el ETL llama `recalcular_producto` al final para cada producto.
6. ✅ Después de carga inicial: activar los 3 triggers de §3.3.
7. ✅ Implementar la query principal de búsqueda agrupada (§4.1) con parámetros configurables.
8. ✅ Implementar autocompletado (§6.2) con cache en Redis para términos frecuentes.
9. ✅ Crear endpoints de filtros independientes (por categoría, color, precio, stock).
10. ✅ Persistir toggle "sin IGV / con IGV" en sesión del usuario; default SIN IGV.
11. ✅ Paginación con OFFSET/LIMIT (suficiente al inicio).
12. ✅ Monitorear `pg_stat_statements` para detectar queries lentas y crear índices ad-hoc si surgen.

---

## 14. Mantenimiento operativo

- **Reindexar GIN** después de actualizaciones masivas (re-ingesta de catálogos): `REINDEX INDEX CONCURRENTLY idx_producto_texto_busqueda;`
- **Analizar tablas** después de carga para que el optimizador tenga estadísticas frescas: `ANALYZE producto, variante, precio_escala;`
- **Vacuum** automático ya activado por defecto en PostgreSQL; no requiere acción.
- **Logs lentos**: `log_min_duration_statement = 200` para capturar queries > 200 ms y revisar.

---

## 15. Notas para confirmar al implementar

- La ruta exacta del archivo `promos.syn` depende de la instalación de PostgreSQL (puede ser `/usr/share/postgresql/14/tsearch_data/`, `/var/lib/postgresql/.../tsearch_data/`, etc.). El admin de la BD debe ubicarlo.
- El umbral de similitud de trigramas (default 0.3) puede requerir ajuste tras probar con consultas reales: `SET pg_trgm.similarity_threshold = 0.25;` lo hace más permisivo.
- El listado de sinónimos del §2.3 es un punto de partida. Se ampliará con los términos que los usuarios usen realmente (analizable en los logs de búsqueda).

---

*Documento del Bloque 7 — estrategia completa de búsqueda y rendimiento. SQL listo para copiar. Cumple el objetivo central del proyecto: encontrar productos lo más rápido posible.*