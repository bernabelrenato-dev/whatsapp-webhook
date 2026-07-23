# Bloque 2 — Diccionario de Datos Unificado

**Proyecto:** Base de datos unificada de catálogos de artículos publicitarios
**Fecha:** 28 de mayo de 2026
**Estado:** ✅ Validado dos veces (ejemplos confirmados reales + tipos/casos límite verificados)
**Motor destino:** PostgreSQL (con pg_trgm + full-text search)

> Este documento define los **campos canónicos** del modelo destino: el vocabulario único al que se mapearán los 6 formatos Excel + 1 PDF. Los ejemplos provienen de datos reales extraídos de los catálogos.

---

## 1. Convenciones

- **Nombres de campo:** `snake_case`, en español sin tildes (compatibilidad con Postgres).
- **Tipos:** notación PostgreSQL (`text`, `integer`, `numeric(10,2)`, `boolean`, `timestamptz`, `jsonb`).
- **Obligatoriedad:** `Sí` = NOT NULL; `No` = admite NULL; `Generado` = lo crea el ETL.
- **Moneda:** todos los precios en Soles peruanos (PEN).
- **Nivel:** indica a qué entidad pertenece el campo (Producto, Variante, Precio, etc.).

---

## 2. Entidades del modelo

El modelo se organiza en estas entidades canónicas (detalle de tablas y relaciones en el Bloque 3):

1. **proveedor** — origen del catálogo (Chiper, EF, Tienda Publi, Promos, Promomerch, Company).
2. **categoria** — categoría unificada del producto.
3. **producto** — el artículo base (datos comunes a todas sus variantes).
4. **variante** — combinación producto + color, con su propio stock.
5. **precio_escala** — precio unitario según rango de cantidad (modelo flexible).
6. **imagen** — imágenes asociadas al producto/variante.
7. **atributos** — campos opcionales específicos de algún proveedor (jsonb).

---

## 3. Diccionario de campos

### 3.1 Entidad: proveedor

| Campo | Tipo | Oblig. | Ejemplo real | Descripción |
|-------|------|--------|--------------|-------------|
| `id` | integer (PK) | Generado | 1 | Identificador interno. |
| `nombre` | text | Sí | "Promos" | Nombre del proveedor. |
| `nombre_archivo` | text | Sí | "PROMOS.xlsx" | Archivo de origen. |
| `ruc` | text | No | "20605121927" | RUC si está disponible (ej. Company). |
| `precio_incluye_igv` | boolean | Sí | false | Si los precios del catálogo ya incluyen IGV. Solo Tienda Publi = true. |
| `fecha_catalogo` | date | No | 2026-03-22 | Fecha del stock/catálogo. |
| `moneda` | text | Sí | "PEN" | Moneda (siempre PEN por ahora). |

### 3.2 Entidad: categoria

| Campo | Tipo | Oblig. | Ejemplo real | Descripción |
|-------|------|--------|--------------|-------------|
| `id` | integer (PK) | Generado | 12 | Identificador interno. |
| `nombre_canonico` | text | Sí | "Tomatodos" | Nombre unificado de categoría. |
| `nombre_origen` | text | No | "TOMATODOS-MUG" | Nombre tal como vino en el catálogo (hoja/sección). |

### 3.3 Entidad: producto

| Campo | Tipo | Oblig. | Ejemplo real | Descripción |
|-------|------|--------|--------------|-------------|
| `id` | integer (PK) | Generado | 1024 | Identificador interno único. |
| `proveedor_id` | integer (FK) | Sí | 1 | Proveedor de origen. |
| `categoria_id` | integer (FK) | Sí | 12 | Categoría unificada. |
| `codigo_proveedor` | text | No | "3111" / "TC-105" | Código original del proveedor (puede faltar: Tienda Publi). |
| `codigo_sistema` | text | No | "PD04896" | Código de sistema único (solo Promos). |
| `nombre` | text | Sí | "LAPICERO PLASTICO" / "PARLANTE BLUETOOTH" | Nombre del producto. |
| `descripcion` | text | No | "Material: Vidrio resistente. Capacidad: 500ml" | Descripción (puede venir partida en varias filas; se concatena). |
| `tipo_impresion` | text | No | "SERIGRAFIA" | Técnica de impresión (solo Promoprime). |
| `presentacion` | text | No | "CAJA BLANCA INDIVIDUAL" | Empaque/presentación (Promos, Tienda Publi). |
| `observaciones` | text | No | "NUEVO INGRESO" | Notas/ofertas (Promos). |
| `atributos` | jsonb | No | {"detalle_caja": "Caja x 40 unid"} | Campos extra no estándar. |

### 3.4 Entidad: variante

| Campo | Tipo | Oblig. | Ejemplo real | Descripción |
|-------|------|--------|--------------|-------------|
| `id` | integer (PK) | Generado | 5567 | Identificador interno. |
| `producto_id` | integer (FK) | Sí | 1024 | Producto al que pertenece. |
| `color` | text | No | "AZUL" / "FUCSIA CLARO" / "TRANSP MATE" | Color de la variante (texto crudo; normalización en Bloque 6). |
| `color_normalizado` | text | No | "azul" | Color unificado (se llena en Bloque 6). |
| `stock` | integer | No | 14565 / 0 / -5 | Stock disponible. Rango real observado: -5 a 60242. Puede ser 0 o negativo en origen (decisión de manejo en Bloque 10). |
| `stock_en_transito` | integer | No | 500 | Stock futuro (Promoprime col, Promos hoja). |
| `fecha_transito` | date | No | 2026-02-28 | Fecha estimada de llegada (Promoprime). |
| `codigo_sistema_variante` | text | No | "PD04896" | En Promos, cada color tiene su propio código de sistema. |

### 3.5 Entidad: precio_escala

Modelo flexible: en vez de 3 columnas fijas, cada precio es una fila (cantidad mínima → precio unitario). Permite escalas distintas entre proveedores.

| Campo | Tipo | Oblig. | Ejemplo real | Descripción |
|-------|------|--------|--------------|-------------|
| `id` | integer (PK) | Generado | 9981 | Identificador interno. |
| `producto_id` | integer (FK) | Sí | 1024 | Producto. |
| `cantidad_minima` | integer | Sí | 500 / 100 / 50 / 1 | Cantidad a partir de la cual aplica el precio. |
| `precio_unitario` | numeric(10,2) | Sí | 32.50 / 0.80 | Precio por unidad sin IGV (normalizado). |
| `precio_unitario_con_igv` | numeric(10,2) | No | 38.35 | Precio con IGV (calculado o de origen). |
| `etiqueta_origen` | text | No | "A PARTIR DE 500 UND" | Etiqueta original de la escala. |

### 3.6 Entidad: imagen

| Campo | Tipo | Oblig. | Ejemplo real | Descripción |
|-------|------|--------|--------------|-------------|
| `id` | integer (PK) | Generado | 333 | Identificador interno. |
| `producto_id` | integer (FK) | Sí | 1024 | Producto asociado. |
| `ruta` | text | Sí | "img/promos/PD04896.png" | Ruta/URL de la imagen (detalle en Bloque 8). |
| `origen` | text | No | "embebida_xlsx" | De dónde salió (embebida, PDF, externa). |
| `es_principal` | boolean | No | true | Si es la imagen principal del producto. |

---

## 4. Campos calculados / derivados (búsqueda)

Estos no vienen del origen; se generan para acelerar la búsqueda (detalle en Bloque 7):

| Campo | Tipo | Nivel | Descripción |
|-------|------|-------|-------------|
| `texto_busqueda` | tsvector | Producto | Vector full-text (nombre + descripción + categoría + color). |
| `nombre_normalizado` | text | Producto | Nombre en minúsculas, sin tildes, para pg_trgm. |
| `stock_total` | integer | Producto | Suma de stock de todas las variantes (para filtrar "en stock"). |
| `precio_minimo` | numeric(10,2) | Producto | Precio unitario más bajo (para ordenar/filtrar por precio). |

---

## 5. Notas de mapeo detectadas (para Bloque 5)

1. **Tienda Publi:** el nombre real del producto NO está en la columna `PRODUCTO` (suele venir vacía), sino en la **primera fila de `DESCRIPCION x PRODUCTO`** (ej. "BOTELLA TORRENOSTRA"). Las filas siguientes de esa columna son Material/Capacidad/Medida.
2. **Chiper / EFStock:** la fila con código trae el producto y precios; las filas siguientes solo color + stock (heredan el código por celdas vacías).
3. **Promos:** una fila por variante; el color puede venir vacío en algunas filas aunque haya código de sistema.
4. **Promoprime:** filas de banda de categoría (ej. "ESCRITORIO") sin más datos → son separadores, no productos.
5. **Precios:** vienen como texto con prefijo `S/`, `S/.`, espacios, comas de miles (ej. `S/11,000.0`, `S/18,000.0`) y a veces el sufijo "INCLUIDO IGV" o el texto "CONSULTAR PRECIO". El ETL debe limpiarlos a numeric (quitar `S/`, comas y sufijos; "CONSULTAR PRECIO" → NULL). El tipo `numeric(10,2)` cubre el rango real (máximos de decenas de miles).

---

*Documento del Bloque 2 — validado dos veces contra archivos reales. Listo para tu revisión antes de avanzar al Bloque 6 (Vocabularios/dedup).*
