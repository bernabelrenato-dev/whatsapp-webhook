# Chat y contexto — BD Unificada de Catálogos Publicitarios

**Tipo de documento:** Bitácora del chat de diseño + contexto para retomar
**Fecha del chat:** 28-29 de mayo de 2026
**Etiqueta del archivo:** Chat y contexto
**Proyecto:** Base de datos unificada de catálogos de artículos publicitarios (PE)
**Usuario:** Renato (renatobs04@gmail.com)
**Origen de catálogos:** carpeta compartida de jacksmprobinson@gmail.com

> Este archivo es un resumen estructurado del proceso de diseño, no una transcripción literal. La conversación cubrió 2 sesiones; la primera se compactó automáticamente al cierre. Se conservan las decisiones, los giros importantes y todo lo necesario para retomar el proyecto desde cero o continuar con otra herramienta/IA.

---

## 1. Lo que el usuario pidió

> "Eres un experto en diseñar bases de datos para encontrar productos lo más rápido posible."

A partir de ahí: 7 catálogos de proveedores peruanos de artículos publicitarios (6 Excel + 1 PDF, total ~140 MB) que llegan periódicamente y se quieren unificar en una BD con búsqueda rápida.

Fuentes de datos (todas en español, todas en Soles peruanos):

| Archivo | Proveedor | Peso | Volumen |
|---------|-----------|------|---------|
| CHEAPER.xlsx | Chiper/Bellagio | 2.8 MB | ~243 productos, 11 hojas |
| CHIPER.xlsx | Chiper/Bellagio | 2.8 MB | ~243 productos, 10 hojas |
| TIENDA PUBLI.xlsx | Tienda Publi | 76 MB | ~191 productos, imágenes embebidas pesadas |
| PROMOPRIME.xlsx | Promomerch | 7.6 MB | ~143 productos, 1 hoja con bandas |
| PROMOS.xlsx | Promos | 37 MB | ~469 variantes, 19 hojas |
| EFSTOCK.xlsx | EF | 9 MB | ~340 productos, 19 hojas |
| COMPANY.pdf | COMPANY (RUC 20605121927) | 4.9 MB | catálogo general amplio |

---

## 2. Reglas de trabajo acordadas (vigentes durante todo el proyecto)

- Todos los documentos generados van en la carpeta `DOCUMENTACION-BD-CATALOGOS/` (Drive id `1GpXKJCWDwY43cgsJ_SelY_5NgeCc8kX3`).
- Los 7 catálogos originales son **solo lectura**, nunca se escriben ni modifican.
- **Cada bloque se valida DOS VECES** contra los archivos reales antes de cerrarse (acuerdo explícito del usuario).
- Re-ingesta contemplada en el diseño (catálogos llegan periódicamente) pero **sin automatización por ahora**.
- Imágenes **sí** entran en el alcance del proyecto.

---

## 3. Decisiones tecnológicas tomadas

| Decisión | Valor | Razón |
|----------|-------|-------|
| Motor BD | **PostgreSQL 14+** | Un solo sistema, FTS nativo en español, índices GIN, suficiente para 5,000-10,000 productos |
| Búsqueda | **pg_trgm + FTS nativo** (no Meilisearch/Typesense por ahora) | Volumen bajo no justifica un motor externo; modelo de datos preparado para migrar después si crece |
| Almacenamiento de imágenes | **Filesystem local** con estructura `img/<proveedor>/{original,thumb}/` | Volumen ~300-400 MB total; migración a S3 trivial cuando crezca |
| Lenguaje del esquema | Español sin tildes, `snake_case` | Compatibilidad con Postgres y consistencia |

---

## 4. Preguntas críticas del usuario y giros del proyecto

Estas son las decisiones del usuario que más impactaron el diseño:

### 4.1 "¿Dónde guardo lo que genero?"
**Decisión:** carpeta nueva `DOCUMENTACION-BD-CATALOGOS/`, separada de los originales.

### 4.2 "¿Falta alguna documentación que no estés considerando?"
Inicialmente el plan tenía 5 bloques (centrados solo en el diseño de la BD). El usuario pidió revisar si faltaba algo. Se detectaron 5 piezas faltantes para que fuera un sistema completo: vocabularios/dedup, búsqueda y rendimiento, imágenes, re-ingesta y QA. **Resultado: el plan creció de 5 a 10 bloques.**

### 4.3 "¿Por qué saltarías al Bloque 6 antes del 3?"
**Decisión:** orden de ejecución por dependencias, no por número. El 6 (vocabularios + dedup) alimenta al 3 (esquema) — si se hace el 3 primero, hay que rehacerlo al descubrir tablas nuevas (`producto_maestro`, `color`, `color_mapeo`, etc.).

### 4.4 "Si ese proveedor sí cobra IGV para todas sus ventas, en el caso del resto IGV es opcional"
**El giro más grande del proyecto.** Yo había asumido que los precios sin IGV de los 5 proveedores eran "base contable" y que siempre se sumaba 18%. El usuario aclaró que NO: en ese mercado, el IGV de los 5 proveedores se cobra **solo si el cliente pide factura**; en venta normal el precio publicado es el neto que se paga.

**Resultado del giro:**
- Se reemplazó el flag boolean `precio_incluye_igv` por una columna `politica_igv` con 3 valores enumerados: `igv_siempre_incluido` (Tienda Publi), `igv_opcional_segun_factura` (los otros 5), `igv_siempre_excluido` (reservado futuro).
- Se reemplazó el campo único `precio_unitario` por **dos campos siempre poblados**: `precio_base` (sin factura) y `precio_con_igv` (con factura).
- Lo mismo en derivados: `precio_minimo_base` + `precio_minimo_con_igv`.
- La búsqueda devuelve ambos; la UI muestra el que el usuario elija con un **toggle persistente**.
- **Default del toggle: SIN IGV** (decisión del usuario; el precio neto es el más común en venta diaria).

Esto obligó a reescribir el Bloque 3 (esquema/DDL) y el Bloque 4 (reglas), publicados como versiones `-v2`. Las viejas siguen documentadas como histórico en el plan maestro (`00-plan-maestro.md`).

### 4.5 "Siempre tienes que validar al menos 2 veces el trabajo avanzado"
**Acordado como estándar.** Cada bloque tuvo dos pasadas de validación: (1) cobertura/coherencia del documento, (2) datos reales contra los archivos. Cuando se podía, validación matemática (fórmulas de IGV, redondeos) o sintáctica (sqlglot sobre el SQL).

Casos donde la doble validación encontró errores reales y los corrigió:
- **Bloque 1:** identificó erróneamente al proveedor del PDF como "World Import" → corregido a COMPANY (RUC 20605121927). Decía que CHIPER y CHEAPER eran "idénticos" → no lo son (CHIPER tiene 10 hojas, CHEAPER 11 con `Datos Empresa`). Asumió que el PDF era solo de USB → catálogo general amplio.
- **Bloque 4:** descubrió que la hoja `Ofertas` de Promos (1055 filas) tiene estructura **diferente** a las hojas regulares: sin `CÓDIGO SISTEMA` separado, código embebido en `ARTÍCULO`, sin columna `COLOR` separada, una sola columna de precio.
- **Bloque 6:** "AZUL MARINO/NAVY" que cité como ejemplo de color **no existe** en los archivos reales → ejemplo inventado, eliminado. También se detectó que en Promos hay filas con valores numéricos (precios) colándose en la columna COLOR → desalineación de columnas, requiere localizar por nombre del encabezado, no por índice fijo.

---

## 5. Estado final del proyecto: 10/10 bloques cerrados

| # | Archivo en Drive | Estado |
|---|------------------|--------|
| 00 | `00-plan-maestro.md` | ✅ Hoja de ruta |
| 01 | `01-resumen-comparativo-fuentes-FINAL.md` | ✅ Análisis de 7 catálogos |
| 02 | `02-diccionario-datos.md` | ✅ Campos canónicos |
| 03 | `03-esquema-ddl-v2.md` + `03-esquema-ddl-v2.sql` | ✅ Esquema PostgreSQL ejecutable (12 tablas, 40 statements validados con sqlglot) |
| 04 | `04-reglas-negocio-v2.md` | ✅ IGV opcional, precios, stock, escalas |
| 05 | `05-mapeo-etl-por-proveedor.md` | ✅ Receta ETL para cada uno de los 7 catálogos |
| 06 | `06-vocabularios-deduplicacion.md` | ✅ Colores, categorías, deduplicación |
| 07 | `07-busqueda-rendimiento.md` | ✅ FTS, sinónimos, autocompletado, queries SQL |
| 08 | `08-manejo-imagenes.md` | ✅ Extracción, almacenamiento, vínculos |
| 09 | `09-re-ingesta-manual.md` | ✅ Workflow de actualización |
| 10 | `10-qa-casos-limite.md` | ✅ Validaciones, métricas, 30 casos límite |

---

## 6. Arquitectura final del modelo de datos (resumen)

**12 tablas en PostgreSQL:**

```
proveedor (id, nombre, ruc, politica_igv, fecha_catalogo, ...)
  ├── producto (id, proveedor_id, categoria_id, codigo_proveedor, nombre,
  │             nombre_normalizado, descripcion, tipo_impresion,
  │             presentacion, atributos JSONB,
  │             stock_total, precio_minimo_base, precio_minimo_con_igv,
  │             texto_busqueda TSVECTOR, ...)
  │   ├── variante (id, producto_id, color, color_id, acabado,
  │   │             stock, stock_en_transito, fecha_transito, ...)
  │   ├── precio_escala (id, producto_id, cantidad_minima,
  │   │                  precio_base, precio_con_igv, etiqueta_origen)
  │   └── imagen (id, producto_id, variante_id?, ruta, origen, es_principal)
  └── categoria_mapeo (proveedor_id, nombre_origen, categoria_id)

producto_maestro (id, nombre_canonico, categoria_id)
  └── producto.producto_maestro_id apunta aquí
     [un maestro agrupa el mismo producto de varios proveedores]

categoria (id, nombre_canonico)
color (id, nombre_base)
color_mapeo (id, valor_crudo, color_id, acabado)
dedup_candidato (id, producto_a_id, producto_b_id, similitud, estado)
ingesta_log (id, proveedor_id, archivo, filas_leidas, errores JSONB, estado)
```

**Decisiones de diseño clave:**

1. **`producto_maestro`** agrupa el mismo producto físico entre proveedores. La búsqueda devuelve UN resultado por maestro con las ofertas de cada proveedor desplegables debajo. Resuelve "el mismo USB aparece 3 veces" sin perder comparación de precios.
2. **Color en 2 niveles:** `variante.color` (texto crudo, nunca se pierde) + `color_id` (canónico para filtrar) + `acabado` (mate, brillante, oscuro, claro).
3. **Precios como filas, no columnas:** una fila en `precio_escala` por cada escala de cantidad. Permite que un proveedor tenga 500/100/1 y otro 1000/100/1 sin cambiar el esquema.
4. **Dos precios siempre poblados** en cada escala (`precio_base` y `precio_con_igv`) para soportar el toggle del usuario.
5. **JSONB para atributos opcionales** (campos exclusivos de un proveedor: detalle_caja de Tienda Publi, oferta=remate/promocion de Promos).
6. **Auditoría completa** via `ingesta_log` (alimenta el QA del Bloque 10).

---

## 7. Casos límite documentados (compendio)

30 casos especiales encontrados durante el análisis y su decisión de manejo. Listado completo en `10-qa-casos-limite.md` §5. Los más relevantes:

1. **"CONSULTAR PRECIO"** (Promoprime, 1 caso) → `precio = NULL`.
2. **Stock negativo** (Cheaper, 2 casos: -5 a -1) → guardar 0 + log.
3. **Stock como texto** "DISPONIBLE EN ALMACENES" (Company PDF) → `stock = NULL` + texto en atributos.
4. **Filas título** "STOCK CLIENTES" + fecha en EFStock → saltar filas 1-2.
5. **Banda de categoría** sin datos en Promoprime → ignorar (detectar por coincidir con nombre de categoría).
6. **Tienda Publi sin código** → generar `tp_<slug>` como clave estable.
7. **Nombre en DESCRIPCION** (Tienda Publi) → primera fila del bloque, no en columna PRODUCTO.
8. **Texto "REMATON!!!" en celda IMAGEN** (Promos Ofertas) → NO tratar como imagen.
9. **Columna COLOR con valores numéricos** (Promos) → localizar por nombre de encabezado, no por índice.
10. **Código embebido en ARTÍCULO** (Promos Ofertas) → extraer con regex `^([A-Z]+-\d+)\s`.
11. **Sinónimos de color** (PLATEADO/PLATA/SILVER; GRIS/PLOMO/GUN; TURQUESA/TURQUEZA) → tabla `color_mapeo`.

---

## 8. Lo que explícitamente NO se hizo (decisiones del usuario)

- ❌ **No hay automatización de re-ingesta.** El workflow es manual repetible. Acordado.
- ❌ **No se guarda historial de precios.** Solo último valor. Si en el futuro se necesita auditoría histórica, añadir tabla `precio_historial` append-only.
- ❌ **No se borra ningún producto físicamente.** Solo `atributos.descontinuado = true` + `stock_total = 0`.
- ❌ **No se reagrupa `producto_maestro` automáticamente** en re-ingestas. Las agrupaciones de dedup son decisión humana y se preservan.
- ❌ **No se implementa búsqueda por imagen inversa** (sería un proyecto aparte).
- ❌ **No se generó el código del ETL.** Solo el diseño/receta. La implementación queda para el desarrollador.

---

## 9. Cómo retomar el proyecto

### 9.1 Para implementar (siguiente paso natural)

1. Levantar PostgreSQL 14+ con extensiones `pg_trgm` y `unaccent`.
2. Ejecutar `03-esquema-ddl-v2.sql` para crear las 12 tablas.
3. Crear la configuración FTS `es_unaccent` y el diccionario de sinónimos (`07-busqueda-rendimiento.md` §2).
4. Implementar el ETL en Python siguiendo la receta de `05-mapeo-etl-por-proveedor.md`:
   - Dependencias: `openpyxl`, `pdfplumber`, `pillow`, `psycopg2` o `asyncpg`, `python-slugify`.
   - Orden de carga sugerido: Promos → EFStock → Chiper → Promoprime → Tienda Publi → Company.
5. Aplicar `recalcular_producto()` en lote al final de la carga inicial.
6. Activar los 3 triggers de mantenimiento (`07-busqueda-rendimiento.md` §3.3).
7. Construir la capa de búsqueda con las queries de `07-busqueda-rendimiento.md` §12.
8. Ejecutar los 12 smoke tests de `10-qa-casos-limite.md` §7.

### 9.2 Para continuar con otra IA / otro chat
Si retomas con otra sesión o herramienta, comparte estos 4 documentos como contexto mínimo:
1. `00-plan-maestro.md` (hoja de ruta y decisiones tecnológicas).
2. `03-esquema-ddl-v2.md` (modelo de datos final).
3. `04-reglas-negocio-v2.md` (política IGV y limpiezas).
4. Este archivo (cronología de decisiones y por qué se tomaron).

Con esos 4, cualquier asistente puede reconstruir el contexto y ayudarte sin reabrir las preguntas ya zanjadas.

### 9.3 Si surgen cambios o detalles nuevos al implementar
El plan maestro está vivo. Cuando se implemente el ETL y aparezcan detalles que el diseño no anticipó (sobre todo en el PDF de Company, que es el más frágil), volver a este chat o abrir uno nuevo con los 4 documentos del §9.2 + el detalle nuevo. Ajustar bloque(s) afectado(s) y re-subir con sufijo `-v3` o el que corresponda.

---

## 10. Metadata útil

- **Carpeta de documentación:** Drive id `1GpXKJCWDwY43cgsJ_SelY_5NgeCc8kX3` (`DOCUMENTACION-BD-CATALOGOS/`)
- **Carpeta padre "2026":** Drive id `1BcrQ-KNtXvK1GBrrzfItz4ufPIOXtXV5`
- **Total archivos producidos:** 12 (incluye este).
- **Tamaño total documentación:** ~180 KB (Markdown puro).
- **Tasa IGV Perú 2026 (verificada):** 18% efectivo (15.50% IGV + 2.50% IPM por ley reciente, pero suma siempre 18%).

---

*Bitácora del chat de diseño. Generada al cierre del proyecto el 29 de mayo de 2026. Sirve como punto de retomada para implementación o para sesiones futuras con otra herramienta.*