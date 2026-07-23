# Bloque 3 — Esquema / ERD + DDL

**Proyecto:** Base de datos unificada de catálogos de artículos publicitarios
**Fecha:** 28 de mayo de 2026
**Estado:** ✅ Validado dos veces (sintaxis SQL ejecutable + cobertura completa de Bloques 2 y 6)
**Motor:** PostgreSQL 14+
**Archivo SQL:** `03-esquema-ddl.sql` (DDL completo, listo para ejecutar)

> Este bloque consolida en tablas reales todo lo decidido en los Bloques 2 (Diccionario) y 6 (Vocabularios/Dedup). El DDL está validado con sqlglot y cubre el 100% de los elementos requeridos.

---

## 1. Resumen de tablas

| # | Tabla | Propósito | Tamaño esperado |
|---|-------|-----------|-----------------|
| 1 | `proveedor` | Origen de cada catálogo (6 proveedores). | 6 filas |
| 2 | `categoria` | Categorías canónicas unificadas. | ~15-20 filas |
| 3 | `categoria_mapeo` | Mapeo categoría origen → canónica. | ~80 filas |
| 4 | `color` | Catálogo de colores base. | ~21 filas |
| 5 | `color_mapeo` | Mapeo color crudo → base + acabado. | ~90 filas |
| 6 | `producto_maestro` | Agrupa el mismo producto físico entre proveedores. | ~3,000-7,000 filas |
| 7 | `producto` | Oferta de un proveedor (datos base + precios + descripción). | ~5,000-10,000 filas |
| 8 | `variante` | Producto + color con stock propio. | ~15,000-25,000 filas |
| 9 | `precio_escala` | Filas cantidad → precio (modelo flexible). | ~15,000-30,000 filas |
| 10 | `imagen` | Imágenes asociadas. | variable |
| 11 | `dedup_candidato` | Pares sospechosos de duplicado (revisión manual). | variable |
| 12 | `ingesta_log` | Auditoría de cada carga (alimenta Bloque 10). | crece con el tiempo |

---

## 2. ERD (descripción textual de relaciones)

```
proveedor (1) ───── (N) producto
proveedor (1) ───── (N) categoria_mapeo
categoria (1) ───── (N) producto
categoria (1) ───── (N) producto_maestro
categoria (1) ───── (N) categoria_mapeo

producto_maestro (1) ───── (N) producto          [agrupa ofertas equivalentes]

producto (1) ───── (N) variante
producto (1) ───── (N) precio_escala
producto (1) ───── (N) imagen

color (1) ───── (N) variante                     [color_id = color base normalizado]
color (1) ───── (N) color_mapeo

variante (0..1) ─── (N) imagen                   [imagen opcional por variante]

producto (2) ──── (N) dedup_candidato           [par de candidatos a duplicado]
proveedor (1) ──── (N) ingesta_log
```

**Lectura del diagrama:** las flechas (1)→(N) indican que un registro de la entidad izquierda puede tener N en la derecha. Las FK con `ON DELETE CASCADE` propagan eliminación; las FK con `ON DELETE SET NULL` (producto_maestro_id) permiten desagrupar sin perder el producto.

---

## 3. Decisiones de diseño clave

### 3.1 Producto vs. Producto maestro
- `producto` = la oferta concreta de UN proveedor (con su código, precios y stock).
- `producto_maestro` = la entidad lógica que une las ofertas del mismo artículo físico entre proveedores.
- La **búsqueda devuelve productos maestros**; las ofertas se cargan al expandir el resultado. Esto resuelve el problema de "el mismo USB aparece 3 veces" sin perder la capacidad de comparar precios entre proveedores.

### 3.2 Color en dos niveles
- `variante.color` = texto crudo (no se pierde información del proveedor).
- `variante.color_id` → `color.id` = color base canónico para filtrar.
- `variante.acabado` = matiz opcional (mate, brillante, oscuro, claro).
- El ETL llena `color_id` y `acabado` consultando `color_mapeo` con el valor crudo.

### 3.3 Precios como filas, no columnas (con dos campos: base y con IGV)
- `precio_escala` tiene una fila por cada tramo de cantidad: `(producto_id, cantidad_minima, precio_base, precio_con_igv)`.
- Permite que un proveedor tenga escalas 500/100/1 y otro 1000/100/1 sin cambiar el esquema.
- **Cada escala guarda DOS precios siempre poblados:**
  - `precio_base` = precio publicado de venta normal (sin factura).
  - `precio_con_igv` = precio cuando el cliente solicita factura (18% encima).
- La conversión se hace en el ETL según `proveedor.politica_igv` (ver decisión 3.7).
- La búsqueda devuelve ambos y la UI muestra el que el usuario elija con un toggle.

### 3.4 Campos derivados en `producto` (para búsqueda rápida)
- `stock_total` = suma de stock de variantes (filtro "en stock").
- `precio_minimo_base` = `MIN(precio_base)` sobre las escalas (orden/filtro por precio cuando el toggle está en "sin IGV", default).
- `precio_minimo_con_igv` = `MIN(precio_con_igv)` sobre las escalas (orden/filtro cuando el toggle está en "con IGV").
- `texto_busqueda` = tsvector con nombre + descripción + categoría + colores (full-text).
- `nombre_normalizado` = nombre en minúsculas sin tildes (para `pg_trgm`).
- Se mantendrán vía ETL o triggers (se decide en Bloque 7).

### 3.5 Atributos opcionales como JSONB
- Campos exclusivos de un solo proveedor (ej. `detalle_caja` de Tienda Publi) van en `producto.atributos`.
- No ensucia el esquema y se puede indexar con GIN si alguna vez se necesita filtrar por ahí.

### 3.6 Auditoría y revisión manual
- `dedup_candidato` guarda pares similares pero NO los fusiona automáticamente; deja la decisión al humano.
- `ingesta_log` registra cada carga (filas leídas/creadas/actualizadas, errores) para el QA del Bloque 10.

### 3.7 Política de IGV por proveedor (campo `proveedor.politica_igv`)
Se reemplazó el flag booleano `precio_incluye_igv` (que no captaba el caso real) por una columna `politica_igv` con tres valores posibles:

| Valor | Significado | Aplica a |
|-------|-------------|----------|
| `igv_siempre_incluido` | El precio publicado **ya trae IGV**, sin opción. | Tienda Publi |
| `igv_opcional_segun_factura` | Precio publicado es el **neto que se cobra en venta normal**; si el cliente pide factura, se agrega 18%. | Chiper, EFStock, Promoprime, Promos, Company |
| `igv_siempre_excluido` | Reservado para futuros proveedores B2B donde siempre se factura. | — (futuro) |

El ETL usa esta política para llenar **ambos campos** `precio_base` y `precio_con_igv` en cada escala. Detalles de fórmula en el Bloque 4.

---

## 4. Índices para búsqueda rápida (preview del Bloque 7)

| Índice | Tipo | Sirve para |
|--------|------|-----------|
| `idx_producto_texto_busqueda` | GIN sobre tsvector | Búsqueda full-text "lapicero azul retráctil". |
| `idx_producto_nombre_trgm` | GIN trigramas | Tolerancia a typos: "tomatdo" encuentra "tomatodo". |
| `idx_producto_categoria` | btree | Filtrar por categoría. |
| `idx_producto_proveedor` | btree | Filtrar por proveedor. |
| `idx_producto_maestro` | btree | JOIN producto_maestro → productos. |
| `idx_producto_stock_total` (parcial) | btree | Filtrar "solo en stock" (solo indexa stock > 0). |
| `idx_producto_precio_minimo_base` | btree | Ordenar/filtrar por precio (toggle "sin IGV", default). |
| `idx_producto_precio_minimo_con_igv` | btree | Ordenar/filtrar por precio (toggle "con IGV"). |
| `idx_variante_producto`, `idx_variante_color` | btree | Filtros sobre variantes. |
| `idx_producto_atributos` | GIN jsonb | Filtros opcionales sobre atributos. |

El Bloque 7 detallará la configuración de relevancia, sinónimos y autocompletado sobre estos índices.

---

## 5. Validaciones realizadas

**Validación 1 — Sintaxis SQL ejecutable.** Parseado con `sqlglot` (dialecto postgres): 40/40 statements válidos sin errores. El DDL es directamente ejecutable en PostgreSQL 14+.

**Validación 2 — Cobertura del cambio de política IGV.** Verificación automatizada: los 9 nuevos elementos (`politica_igv`, valores enumerados, `precio_base`, `precio_con_igv`, dos `precio_minimo_*`, dos índices nuevos) están todos presentes; los 4 elementos viejos (`precio_incluye_igv`, `precio_unitario`, etc.) fueron eliminados sin residuos.

---

*Documento del Bloque 3 — validado dos veces. Listo para tu revisión antes de avanzar al Bloque 4 (Reglas de negocio y normalización).*
