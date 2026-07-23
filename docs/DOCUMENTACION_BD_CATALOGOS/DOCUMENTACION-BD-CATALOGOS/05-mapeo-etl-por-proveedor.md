# Bloque 5 — Mapeo ETL por Proveedor

**Proyecto:** Base de datos unificada de catálogos de artículos publicitarios
**Fecha:** 29 de mayo de 2026
**Estado:** ✅ Diseño completo. Fundamentado en hallazgos validados de Bloques 1, 4 y 6. Detalles que requieren abrir los archivos en código se marcan como "a confirmar al implementar".
**Depende de:** Bloques 2 (Diccionario), 3 (Esquema), 4 (Reglas), 6 (Vocabularios), 8 (Imágenes).
**Alimenta a:** Bloques 9 (Re-ingesta) y 10 (QA).

> Este bloque define la receta de extracción y transformación para cada uno de los 7 catálogos origen. Es lo que un programador necesita para implementar el ETL.

---

## 1. Flujo común a todos los proveedores

Todos los archivos siguen el mismo pipeline general:

```
1. Abrir archivo (openpyxl para xlsx, pdfplumber para PDF).
2. Para cada hoja relevante:
   a. Localizar la fila de encabezado.
   b. Resolver índices de columnas POR NOMBRE de encabezado, NO por posición fija.
      (En Promos hay desalineación documentada → ver Bloque 6 §1.5)
   c. Para cada fila de datos:
      - Detectar si es fila-producto, fila-variante o fila-no-producto.
      - Aplicar limpiezas (precios, stock).
      - Aplicar conversión IGV según politica_igv del proveedor.
      - Resolver color_id consultando color_mapeo (Bloque 6).
      - Resolver categoria_id consultando categoria_mapeo.
      - Insertar/actualizar registros en tablas destino.
3. Extraer imágenes embebidas y vincularlas (Bloque 8).
4. Registrar resumen en ingesta_log.
```

### 1.1 Tablas que se pueblan en cada carga
| Orden | Tabla | Cuándo se llena |
|-------|-------|-----------------|
| 1 | `proveedor` | Una vez (al insertar el proveedor) o upsert al recargar. |
| 2 | `categoria` + `categoria_mapeo` | Una vez por valor canónico nuevo / mapeo nuevo. |
| 3 | `color` + `color_mapeo` | Idem. |
| 4 | `producto_maestro` | Solo si la dedup nivel 1 (mismo código) encuentra equivalente; si no, se crea uno nuevo que contiene solo este producto. |
| 5 | `producto` | Una fila por producto del proveedor. |
| 6 | `variante` | Una fila por color del producto. |
| 7 | `precio_escala` | Una fila por escala (`cantidad_minima` → precios). |
| 8 | `imagen` | Una fila por imagen extraída. |
| 9 | `ingesta_log` | Una fila por archivo procesado (auditoría). |

### 1.2 Detección genérica de filas
- **Fila-producto:** tiene código (excepto Tienda Publi) y al menos un precio o un nombre de producto.
- **Fila-variante:** SIN código (heredado), pero con color y stock.
- **Fila-no-producto (se ignora):** vacía; o contiene solo encabezados repetidos; o solo un texto que coincide con nombre de categoría (banda separadora); o pertenece a hoja excluida.

### 1.3 Manejo de errores en una fila
Si una fila falla la limpieza (precio no numérico, stock corrupto, etc.) **no se aborta el archivo entero**: se registra el error en `ingesta_log.errores` (JSONB) y se sigue con la siguiente fila. Solo abortar si la primera hoja del archivo falla por completo (probable archivo corrupto).

---

## 2. Receta por proveedor

### 2.1 CHIPER / BELLAGIO — `CHEAPER.xlsx` y `CHIPER.xlsx`

**Proveedor:** Chiper · `politica_igv = 'igv_opcional_segun_factura'`
**Archivos:** `CHEAPER.xlsx` (11 hojas, ~243 productos) y `CHIPER.xlsx` (10 hojas, ~243 productos)
**Diferencia entre ambos:** CHEAPER trae además la hoja `Datos Empresa` (no es de productos); CHIPER no la tiene.

#### Hojas

| Acción | Hojas |
|--------|-------|
| **Procesar** | `0SETS EJECUTIVOS`, `1LAPICEROS PLASTICOS`, `2LAPICEROS ECOLOGICOS`, `3LAPICEROS METALICOS`, `ACCES. CELULAR Y PC`, `ART. ESCRITORIO`, `ART. MÉDICOS - ANTISTRESS`, `LIBRETAS - POSITS`, `LLAVEROS - HERRAMIETAS`, `TOMATODOS-MUG` |
| **Saltar** | `Datos Empresa` (solo en CHEAPER). Antes de saltarla, **extraer la fecha del catálogo** (aparece como "MARTES 05, MAY. 2026" o similar) y guardarla en `proveedor.fecha_catalogo`. |

#### Encabezado (fila 1, índice 0)

```
CODIGO | IMAGEN | PRODUCTO | COLOR | STOCK FINAL | PRECIO POR MILLAR (≥500 und) | (col vacía) | PRECIO POR CIENTO (≥50/100 und) | PRECIO MUESTRA (máx 5 und) | DESCRIPCIÓN
```

#### Mapeo columna → campo canónico

| Columna origen | Campo destino |
|----------------|---------------|
| `CODIGO` | `producto.codigo_proveedor` |
| `IMAGEN` | imagen embebida → tabla `imagen` (anclaje a esta celda) |
| `PRODUCTO` | `producto.nombre` |
| `COLOR` | `variante.color` (crudo) + resolver `color_id` con `color_mapeo` |
| `STOCK FINAL` | `variante.stock` (limpiar coma de miles; negativos → 0 + log) |
| `PRECIO POR MILLAR` | `precio_escala` con `cantidad_minima = 500`, `etiqueta_origen = 'PRECIO POR MILLAR'` |
| `PRECIO POR CIENTO` | `precio_escala` con `cantidad_minima = 100`, `etiqueta_origen = 'PRECIO POR CIENTO'`. Para lapiceros la mínima real es 100; para otros 50 — usar 100 como base. |
| `PRECIO MUESTRA` | `precio_escala` con `cantidad_minima = 1`, `etiqueta_origen = 'PRECIO MUESTRA'` |
| `DESCRIPCIÓN` | `producto.descripcion` |
| (nombre de hoja) | `producto.categoria_id` vía `categoria_mapeo` |

#### Detección de fila-producto vs fila-variante
- **Fila-producto:** la celda `CODIGO` tiene valor → es la primera fila del producto. Trae color1 + stock1 + precios.
- **Fila-variante:** la celda `CODIGO` está vacía pero `COLOR` y `STOCK` tienen valor → variante adicional del producto anterior. Heredar `producto_id` de la fila-producto inmediatamente anterior.

#### Limpiezas específicas
- Precios formato `S/250.00` o `S/1,400.00` → limpiar `S/` + coma → numeric. Aplicar conversión IGV (×1.18 para `precio_con_igv`).
- Stock negativo (~2 casos en Cheaper): guardar `variante.stock = 0` + registrar el original en `ingesta_log.errores`.
- Stock con coma (ej. `37,639`): quitar coma.

---

### 2.2 EF — `EFSTOCK.xlsx`

**Proveedor:** EF · `politica_igv = 'igv_opcional_segun_factura'`
**Archivo:** `EFSTOCK.xlsx` (19 hojas, ~340 productos, 9 MB)
**Notas clave:** las 19 hojas declaran "LOS PRECIOS NO INCLUYEN IGV" en su fila 2. El encabezado está en fila 3.

#### Hojas a procesar (las 19)

`LAPICEROS DE PLASTICO`, `LAPICEROS PUNTERO LASER`, `LAPICEROS METALICOS`, `ESTUCHES`, `CALCULADORAS`, `JARROS MUG`, `TOMATODOS`, `ART. ESCRITORIO`, `LINEA ECOLOGICA`, `TARJETEROS`, `RESALTADORES`, `TACO CON POST IT`, `ART. ANTIESTRES`, `LLAVEROS`, `BOLSAS`, `ART. PERSONAL`, `ART. DE PROTECCION`, `ART. PLAYA`, `USB`.

#### Encabezado (fila 3, índice 2)

```
(col vacía) | CODIGO | IMAGEN | PRODUCTO | COLOR | STOCK FINAL | PRECIO x MILLAR (≥500 pzs) | PRECIO x CIENTO (≥50 pzs) | PRECIO MUESTRA (<50 pzs) | DESCRIPCION
```

**Saltar:** filas 1 y 2 de cada hoja (título y declaración "NO INCLUYEN IGV") y cualquier fila que repita estos encabezados más abajo en la hoja. La fila 2 de la primera hoja se puede leer una vez para **confirmar la política IGV** del proveedor en la carga.

#### Mapeo
Idéntico al de Chiper. Las escalas son 500 / 50 / <50 (millar / ciento / muestra). Para `cantidad_minima` se usa 500, 50, 1 respectivamente.

#### Detección de fila-producto vs fila-variante
Idéntica a Chiper: fila con `CODIGO` lleno = producto; fila con solo color+stock = variante.

#### Caso límite ya detectado
"STOCK CLIENTES" y "02 DE MARZO DEL 2026" aparecen 19 veces (encabezado repetido al inicio de cada hoja). Ya están cubiertos: se saltan filas 1 y 2 de cada hoja.

---

### 2.3 TIENDA PUBLI — `TIENDA PUBLI.xlsx`

**Proveedor:** Tienda Publi · `politica_igv = 'igv_siempre_incluido'` ⚠️ **único proveedor con esta política**
**Archivo:** `TIENDA PUBLI.xlsx` (14 hojas, ~191 productos, 76 MB con imágenes)
**Particularidad crítica:** el nombre del producto NO está en la columna `PRODUCTO` (suele venir vacía) sino en la **primera fila de `DESCRIPCION x PRODUCTO`**.

#### Hojas a procesar (las 14)

`CUADERNOS Y LIBRETAS`, `OFICINA Y ESCRITORIO`, `RESALTADORES`, `TOMATODOS`, `MUG Y TERMOS`, `ECOLOGICOS`, `LLAVEROS`, `HOME`, `TECNOLOGICOS`, `ARTICULOS DE VIAJE`, `SALUD Y CUIDADO PERSONAL`, `AUTOS Y HERRAMIENTAS`, `VARIOS`, `LIQUIDACIONES`.

#### Encabezado (fila 2, índice 1)

```
PRODUCTO | DESCRIPCION x PRODUCTO | DETALLE x CAJA | COLOR | STOCK | PU 500 A 1000 | PU 50 A 499 | 1 A 49 | PROMOCIONES
```

#### Mapeo columna → campo canónico

| Columna origen | Campo destino |
|----------------|---------------|
| `PRODUCTO` | (vacía en la práctica) — ignorar |
| `DESCRIPCION x PRODUCTO` | Primera fila no vacía bajo cada bloque = `producto.nombre` (ej. "BOTELLA TORRENOSTRA"). Filas siguientes = concatenar en `producto.descripcion`. |
| `DETALLE x CAJA` | `producto.atributos.detalle_caja` (JSONB) |
| `COLOR` | `variante.color` + `color_id` |
| `STOCK` | `variante.stock` |
| `PU 500 A 1000` | `precio_escala` con `cantidad_minima = 500`, `etiqueta_origen = 'PU 500 A 1000'`. Precios traen "INCLUIDO IGV" → política `igv_siempre_incluido`: `precio_con_igv = publicado`, `precio_base = publicado / 1.18`. |
| `PU 50 A 499` | `precio_escala` con `cantidad_minima = 50`, `etiqueta_origen = 'PU 50 A 499'` |
| `1 A 49` | `precio_escala` con `cantidad_minima = 1`, `etiqueta_origen = '1 A 49'` |
| `PROMOCIONES` | `producto.observaciones` |
| (nombre de hoja) | `producto.categoria_id` vía `categoria_mapeo` |

#### Identificación de producto (Tienda Publi no tiene código)
- Sin columna de código → `producto.codigo_proveedor = NULL`.
- Para el unique constraint `(proveedor_id, codigo_proveedor)` esto causaría conflictos al haber varios NULLs → ⚠️ **excepción a manejar**: para Tienda Publi se usa una clave generada `'tp_' + slug(nombre_producto)` y se guarda en `codigo_proveedor` para mantener la unicidad. Documentar esto al implementar.
- Alternativa: cambiar el unique constraint a permitir NULLs duplicados (PostgreSQL ya los considera distintos por defecto, así que técnicamente puede funcionar sin la clave generada). **Decisión: usar la clave generada `'tp_<slug>'` para que la re-ingesta pueda hacer upsert por código y no duplicar.**

#### Detección de bloques producto
El producto es **multifila**: cabecera (con nombre, color1 y precios) seguida de filas de descripción (Material, Capacidad, Medida) y filas de variantes adicionales. Estrategia:

```
bloque_actual = None
para cada fila:
  if fila tiene STOCK + COLOR + algún precio:
    si fila tiene precio en columnas PU → es cabecera de nuevo bloque (producto)
       bloque_actual = nuevo producto
    sino → variante adicional del bloque actual
  elif fila tiene solo DESCRIPCION x PRODUCTO (sin stock ni precio):
    → línea descriptiva, agregar a bloque_actual.descripcion
  elif fila vacía:
    → cierre del bloque
```

**A confirmar al implementar:** la detección exacta del cierre de bloque puede requerir mirar 2-3 ejemplos reales del xlsx para afinar las condiciones.

#### Precios redondos tras conversión (observación del Bloque 4)
Confirmado: `S/ 6.84 / 1.18 = 5.80`, `S/ 7.08 / 1.18 = 6.00`, `S/ 8.50 / 1.18 = 7.20`. Los precios base resultantes son redondos, lo que valida la conversión. No requiere acción especial en el ETL — solo confirma que la fórmula es correcta.

---

### 2.4 PROMOMERCH — `PROMOPRIME.xlsx`

**Proveedor:** Promomerch · `politica_igv = 'igv_opcional_segun_factura'`
**Archivo:** `PROMOPRIME.xlsx` (1 sola hoja `Stock Promomerch (2)`, ~143 productos, 7.6 MB)
**Particularidades:** una sola hoja organizada en **bandas por categoría**, con encabezados repetidos al inicio de cada banda. Tiene dos campos exclusivos: `Tipo de Impresión` y `En Tránsito`.

#### Estructura de la hoja
- Filas de banda: contienen solo texto con un nombre de categoría (`ESCRITORIO`, `PROTECCION`, `RESALTADORES`, etc.) sin más datos. Marcan el inicio de una sección.
- Filas de encabezado repetidas al inicio de cada banda.
- Filas de producto.

#### Encabezado (idéntico en todas las bandas)

```
Artículo | Código | Imagen Referencial | Tipo de Impresión | Descripción | Colores | X Millar (≥500 pzs) | X ciento (≥50 pzs) | Muestra | Stock | En Tránsito
```

#### Mapeo columna → campo canónico

| Columna origen | Campo destino |
|----------------|---------------|
| `Artículo` | `producto.nombre` |
| `Código` | `producto.codigo_proveedor` |
| `Imagen Referencial` | imagen embebida → tabla `imagen` |
| `Tipo de Impresión` | `producto.tipo_impresion` (campo dedicado) |
| `Descripción` | `producto.descripcion` |
| `Colores` | una variante por color (parsear si trae varios separados por comas). `variante.color` + `color_id`. **Atención:** el stock es del producto entero, no por color (a diferencia de los otros proveedores). Reparto: si hay N colores, asignar `stock` al primero y `0` a los demás, o distribuir uniformemente. **Decisión:** asignar `stock = total` a una variante "principal" (primer color) y `stock = 0` a las demás. Documentar en `producto.observaciones`. |
| `X Millar` | `precio_escala` `cantidad_minima = 500`, `etiqueta_origen = 'X Millar'` |
| `X ciento` | `precio_escala` `cantidad_minima = 50`, `etiqueta_origen = 'X ciento'` |
| `Muestra` | `precio_escala` `cantidad_minima = 1`, `etiqueta_origen = 'Muestra'` |
| `Stock` | `variante.stock` (de la variante principal) |
| `En Tránsito` | `variante.stock_en_transito` (puede traer número o texto con fecha estimada → parsear) |
| (banda de categoría) | `producto.categoria_id` |

#### Detección de fila-no-producto
- Fila con texto único que coincide con un nombre de categoría conocido → banda separadora, ignorar.
- Fila idéntica al encabezado (repetición) → ignorar.
- Fila vacía → ignorar.

#### Casos especiales
- **`CONSULTAR PRECIO`** (1 caso real): poner `precio_unitario = NULL` y guardar el texto en `precio_escala.etiqueta_origen`.
- **`En Tránsito` con texto fecha** (ej. "FECHA ESTIMADA 28 DE FEBRERO 2026"): parsear con regex `FECHA ESTIMADA\s+(\d+)\s+DE\s+(\w+)\s+(\d+)` → poblar `variante.fecha_transito`. Si el número de unidades no aparece, dejar `stock_en_transito = NULL`.

---

### 2.5 PROMOS — `PROMOS.xlsx`

**Proveedor:** Promos · `politica_igv = 'igv_opcional_segun_factura'`
**Archivo:** `PROMOS.xlsx` (19 hojas: 16 categorías + 3 especiales, ~469 variantes únicas, 37 MB)
**Particularidades:** el más limpio para producto→variante (una fila por variante con su propio código de sistema). PERO las 3 hojas especiales tienen estructura distinta.

#### Hojas regulares (16 de categoría)
`Cuidado Personal`, `Tecnología`, `Accesorios para Celular`, `Hogar`, `Herramienteros`, `Lápices y Lapiceros`, `Resaltadores`, `Libretas`, `Art. para Oficina`, `Art. Ecológicos para Oficina`, `Tomatodos`, `Mugs y Tazas`, `Mochilas y Bolsos`, `Verano`, `Viaje`, `Fundas y Estuches`.

**Encabezado (fila 3, índice 2):**

```
LINEA | CÓDIGO | ARTÍCULO | CÓDIGO SISTEMA | IMAGEN | COLOR | STOCK | A PARTIR DE 500 UND | A PARTIR DE 50 UNID | DE 1 A 49 UNID | DESCRIPCIÓN | PRESENTACIÓN | OBSERVACIONES
```

#### Mapeo (hojas regulares)

| Columna origen | Campo destino |
|----------------|---------------|
| `LINEA` | `producto.categoria_id` vía `categoria_mapeo` (alternativa al nombre de hoja; usar el de mayor confianza) |
| `CÓDIGO` | `producto.codigo_proveedor` (comercial, ej. `TC-105`) |
| `ARTÍCULO` | `producto.nombre` |
| `CÓDIGO SISTEMA` | `variante.codigo_sistema_variante` (ej. `PD04896` — único por variante, ideal como clave natural) |
| `IMAGEN` | imagen embebida → tabla `imagen` (vincular a `variante_id`, no a producto, porque cada color tiene la suya) |
| `COLOR` | `variante.color` + `color_id`. ⚠️ Localizar columna por nombre, no por índice (desalineación documentada en Bloque 6). |
| `STOCK` | `variante.stock` |
| `A PARTIR DE 500 UND` | `precio_escala` `cantidad_minima = 500`, `etiqueta_origen = 'A PARTIR DE 500 UND'` |
| `A PARTIR DE 50 UNID` | `precio_escala` `cantidad_minima = 50`, `etiqueta_origen = 'A PARTIR DE 50 UNID'` |
| `DE 1 A 49 UNID` | `precio_escala` `cantidad_minima = 1`, `etiqueta_origen = 'DE 1 A 49 UNID'` |
| `DESCRIPCIÓN` | `producto.descripcion` |
| `PRESENTACIÓN` | `producto.presentacion` |
| `OBSERVACIONES` | `producto.observaciones` |

#### Detección de producto vs variante
- Promos tiene **una fila por variante**: cada fila trae CÓDIGO SISTEMA único.
- Múltiples filas con el mismo `CÓDIGO` (comercial) pero distinto `CÓDIGO SISTEMA` y `COLOR` = mismo producto, distintas variantes.
- Estrategia:
  1. Primera fila con un `CÓDIGO` nuevo → crear `producto`.
  2. Filas siguientes con el mismo `CÓDIGO` → solo crear `variante` (no duplicar producto).
  3. Precios suelen ser iguales entre variantes; tomar los de la primera fila del producto. Si difieren entre filas del mismo código → es señal de error de captura del proveedor; log warning.

#### Hojas especiales

##### 2.5.1 `REMATES!` (147 filas)
**Estructura diferente:**

```
LINEA | ARTÍCULO | (CÓDIGO SISTEMA, sin encabezado claro) | IMAGEN | STOCK | A PARTIR DE 500 UND | A PARTIR DE 50 UNID | DE 1 A 49 UNID | DESCRIPCION | PRESENTACION | RESERVAS | OBSERVACIONES
```

- Trae campo extra `RESERVAS` (cantidad reservada para otros clientes) y notas tipo "Restricción en el envío…" en `OBSERVACIONES`.
- **Mapeo especial:**
  - `RESERVAS` → `producto.atributos.reservas` (JSONB).
  - `producto.atributos.oferta = "remate"` para marcar.
- La categoría se toma de `LINEA`, no del nombre de hoja.

##### 2.5.2 `EN TRÁNSITO` (13 filas)
Se cargan como productos normales pero con:
- `variante.stock = 0`
- `variante.stock_en_transito = <cantidad>`
- Si trae fecha estimada → `variante.fecha_transito`

No se crea ninguna tabla aparte; van a las mismas tablas que el resto.

##### 2.5.3 `Ofertas` (1055 filas) ⚠️ la más grande y la más distinta

**Estructura simplificada:**

```
LINEA | ARTÍCULO | IMAGEN (con texto "REMATON!!!", "OFERTA!!!") | STOCK | PRECIO UNIT A PARTIR DE X | DESCRIPCION | RESERVAS | OBSERVACIONES
```

**Diferencias críticas vs hojas regulares:**
- **Sin `CÓDIGO SISTEMA` separado:** el código viene dentro de `ARTÍCULO`. Extraer con regex `^([A-Z]+-\d+)\s` → ej. `TC-28 POWER BANK...` da código `TC-28`.
- **Sin `COLOR` separado:** cuando hay color va en `DESCRIPCION` (texto libre). El ETL puede intentar detectarlo con coincidencia contra `color_mapeo`, pero **es opcional**: si no se detecta, dejar `color = NULL`.
- **Sin `PRECIO POR MILLAR/CIENTO`:** una sola columna de precio con texto variable "A PARTIR DE X UNIDADES" → leer la cantidad mínima del encabezado o del propio texto.
- **`IMAGEN` es texto, no imagen:** ya documentado en Bloque 8 §1.1. NO crear registro en `imagen`.
- **Riesgo de duplicado:** muchas filas son productos de hojas regulares con precio rebajado. La deduplicación nivel 1 (Bloque 6) los unirá por código si lo extraemos bien con la regex.

**Mapeo especial:**
- `producto.atributos.oferta = "promocion"` para marcar.
- Si el código extraído coincide con un producto ya cargado de una hoja regular → no duplicar; crear una segunda escala de precio con `etiqueta_origen = "OFERTA"` y un flag en atributos.

---

### 2.6 COMPANY — `COMPANY.pdf`

**Proveedor:** COMPANY (RUC 20605121927, Jr. Lampa 764 — Of. 146, Lima) · `politica_igv = 'igv_opcional_segun_factura'`
**Archivo:** `COMPANY.pdf` (4.9 MB, catálogo general amplio)
**Particularidades:** es el más difícil. Formato PDF con tabla densa, sin estructura limpia de columnas. El ETL requerirá `pdfplumber` + heurísticas. Declara al inicio "PRECIO EN SOLES NO INCLUYE EL I.G.V".

#### Campos esperados (a confirmar al implementar abriendo el PDF)

```
CÓDIGO | IMAGEN | PRODUCTO/DESCRIPCIÓN | COLOR | STOCK | PRECIO 1000 und | PRECIO 100-499 und | PRECIO 1-99 und | EMPAQUE
```

#### Estrategia de extracción

```
1. Usar pdfplumber.extract_tables() página por página.
2. Si la extracción de tablas falla en alguna página (PDFs son frágiles):
   a. Caer a extract_text() + parser por líneas con regex.
   b. Detectar inicio de fila por código (regex de código del proveedor).
3. Resolver columnas por encabezado de la página (algunos PDFs lo repiten por página).
4. Mapeo similar a Chiper pero con escalas distintas:
   - PRECIO 1000 und → cantidad_minima = 1000
   - PRECIO 100-499 und → cantidad_minima = 100
   - PRECIO 1-99 und → cantidad_minima = 1
5. Imágenes: extraerlas por bounding box y asociar a la fila por proximidad vertical (Bloque 8 §2.2).
```

#### Casos especiales documentados
- **Stock como texto:** "DISPONIBLE EN NUESTROS ALMACENES", "EN TRANSITO", "NUEVO INGRESO", "MERCADERIA EN LIQUIDACION".
  - `stock = NULL` + guardar el texto en `variante.atributos.stock_estado` (JSONB).
  - Estos productos NO entran al filtro "en stock" del Bloque 7; aparecen como "consultar disponibilidad".
- **Una fila por color:** misma estrategia que Promos (variantes por fila).
- **Fecha del catálogo:** aparece al inicio del PDF (19 MAR 2026) → guardar en `proveedor.fecha_catalogo`.

#### Riesgo y mitigación
- Tasa de error esperada ~10% (PDFs son frágiles). Aceptable porque el catálogo de Company se sobrepone con otros (mugs, lapiceros, USB también están en EFStock/Promos/etc.) → la deduplicación recupera info.
- Registrar todos los fallos en `ingesta_log.errores` con detalle suficiente para revisión manual.

---

## 3. Orden recomendado de primera carga

Cargar los proveedores en este orden permite que la deduplicación nivel 1 (por código) funcione bien:

| Orden | Proveedor | Razón |
|-------|-----------|-------|
| 1 | Promos | Es el más limpio (códigos sistema únicos por variante). Establece la base. |
| 2 | EFStock | Volumen alto y estructura uniforme. Genera muchos productos maestros. |
| 3 | Chiper (CHEAPER) | Aporta `fecha_catalogo` y variedad de categorías. |
| 4 | Chiper (CHIPER) | Probable dedup masiva con CHEAPER (mismo proveedor → mismos productos). |
| 5 | Promoprime | Aporta `tipo_impresion` y `en_transito` que ningún otro tiene. |
| 6 | Tienda Publi | Más lento (76 MB de imágenes). Su `politica_igv` distinta no afecta a los demás. |
| 7 | Company (PDF) | El más frágil. Si falla parcialmente, no bloquea los datos ya cargados. |

---

## 4. Salidas esperadas (estimación de volumen)

Después de cargar los 7 catálogos:

| Tabla | Filas estimadas |
|-------|-----------------|
| `proveedor` | 6 (Chiper unifica CHEAPER + CHIPER) |
| `categoria` | ~15-20 (canónicas) |
| `categoria_mapeo` | ~80 |
| `color` | ~21 |
| `color_mapeo` | ~90 |
| `producto_maestro` | ~3,000-5,000 (depende de cuánto dedup ocurra) |
| `producto` | ~5,000-7,000 (suma bruta menos algunos consolidados) |
| `variante` | ~15,000-25,000 |
| `precio_escala` | ~15,000-25,000 (3 escalas por producto, en promedio) |
| `imagen` | ~1,500-2,000 |
| `dedup_candidato` | algunas decenas (nivel 2, para revisión manual) |
| `ingesta_log` | 7 (uno por archivo) |

---

## 5. Checklist por proveedor (resumen ejecutivo)

| # | Proveedor | Hojas | Política IGV | Particularidades clave |
|---|-----------|-------|--------------|-------------------------|
| 1 | Chiper (CHEAPER) | 10 productos + saltar `Datos Empresa` | `igv_opcional_segun_factura` | Fecha catálogo en `Datos Empresa`; stock negativo raro |
| 2 | Chiper (CHIPER) | 10 productos | `igv_opcional_segun_factura` | Idéntica a CHEAPER sin `Datos Empresa` |
| 3 | EFStock | 19 productos | `igv_opcional_segun_factura` | Saltar filas 1-2 (título + IGV); encabezado fila 3 |
| 4 | Tienda Publi | 14 productos | **`igv_siempre_incluido`** | Sin código → generar `'tp_<slug>'`; nombre en DESCRIPCION x PRODUCTO; precios ÷1.18 |
| 5 | Promoprime | 1 hoja con bandas | `igv_opcional_segun_factura` | Campos exclusivos `tipo_impresion` y `en_transito`; colores múltiples en una fila |
| 6 | Promos | 16 categorías + 3 especiales (REMATES!, EN TRÁNSITO, Ofertas) | `igv_opcional_segun_factura` | Códigos sistema únicos por variante; 3 hojas con estructura distinta |
| 7 | Company (PDF) | — | `igv_opcional_segun_factura` | Frágil; usar pdfplumber; stock textual; escalas 1000/100/1 |

---

## 6. Notas para confirmar al implementar

Estos puntos requieren abrir los archivos con código (no disponible en esta sesión) y se verifican durante el desarrollo:

- Índices exactos de columnas en cada hoja (mientras el ETL resuelve por nombre, igualmente conviene auditar).
- Detección exacta del cierre de bloque-producto en Tienda Publi (sección 2.3).
- Confirmar que en Promoprime la columna `Colores` trae los colores separados por coma/punto y coma (afinar el parseo).
- Cantidad real de imágenes embebidas por archivo (cuento estimado vs real).
- Estructura exacta de `REMATES!` en Promos (campo `CÓDIGO SISTEMA` sin encabezado claro — confirmar cómo detectarlo).
- En el PDF de Company: si los encabezados se repiten por página o solo aparecen al inicio (afecta el parser).

---

*Documento del Bloque 5 — receta ETL completa por proveedor. Apoyado en hallazgos validados de Bloques 1, 4, 6 y 8. Los puntos de la sección 6 se verifican al implementar.*