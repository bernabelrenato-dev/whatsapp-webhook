# Bloque 4 — Reglas de Negocio y Normalización

**Proyecto:** Base de datos unificada de catálogos de artículos publicitarios
**Fecha:** 28 de mayo de 2026
**Estado:** ✅ Validado dos veces (política IGV reescrita con toggle base/con_igv + fórmulas verificadas matemáticamente)
**Depende de:** Bloques 2 (Diccionario), 3 (Esquema), 6 (Vocabularios).
**Alimenta a:** Bloque 5 (ETL por proveedor), Bloque 10 (QA).

> Este bloque fija las reglas que convierten datos crudos en datos limpios y comparables. Cada regla está fundamentada con evidencia real extraída de los catálogos.

---

## 1. Tratamiento del IGV

### 1.1 La realidad del mercado (clave para entender la política)
En el mercado peruano de artículos publicitarios, **el IGV NO es uniforme entre proveedores**:

- **Tienda Publi:** publica precios **siempre con IGV incluido** (lo dice literalmente en 551 celdas: "INCLUIDO IGV"). El cliente paga ese precio tal cual.
- **Los otros 5 proveedores:** publican el **precio neto de venta normal**. El IGV (18%) se agrega **solo si el cliente pide factura**; en venta normal el cliente paga el precio publicado sin IGV adicional. Es decir, el IGV es **opcional según el tipo de comprobante / negociación**.

Esto significa que NO se puede asumir simplemente "todos los precios sin IGV son la base contable y luego se suma IGV". El precio publicado por los otros 5 ES el precio de calle que normalmente se cobra.

### 1.2 Tasa aplicable
La tasa efectiva del IGV en Perú para el régimen general (artículos publicitarios) es del **18%** durante 2026, y se mantendrá en ese total durante los próximos años aunque la ley reciente cambie su composición interna (15.50% IGV + 2.50% IPM en 2026, evolucionando con el IPM subiendo y el IGV bajando, pero sumando siempre 18%). La tasa especial del 10.5% no aplica (es solo para MYPEs de restaurantes y hoteles).

### 1.3 Política unificada del modelo: dos precios por escala
En vez de almacenar un solo precio, **cada escala guarda DOS precios siempre poblados**:

| Campo en `precio_escala` | Significado | Cómo se usa en búsqueda |
|--------------------------|-------------|--------------------------|
| `precio_base` | Precio de venta normal **sin factura** (lo que pagas en venta diaria). | Toggle "sin IGV" — **default**. |
| `precio_con_igv` | Precio cuando el cliente solicita **factura** (IGV 18% incluido). | Toggle "con IGV". |

Esto permite que el usuario alterne entre ver precios sin/con IGV y los resultados se comparen siempre en igualdad de condiciones entre proveedores.

### 1.4 Política por proveedor (campo `proveedor.politica_igv`)

| Proveedor | `politica_igv` | Origen del precio | Cómo se calculan los dos campos |
|-----------|----------------|--------------------|----------------------------------|
| Tienda Publi | `igv_siempre_incluido` | Precio publicado YA trae IGV | `precio_con_igv = publicado` ; `precio_base = publicado / 1.18` |
| Chiper | `igv_opcional_segun_factura` | Precio publicado es el neto de venta normal | `precio_base = publicado` ; `precio_con_igv = publicado * 1.18` |
| EFStock | `igv_opcional_segun_factura` | (declarado en hoja: "NO INCLUYEN IGV") | Igual que Chiper |
| Promoprime | `igv_opcional_segun_factura` | Neto | Igual que Chiper |
| Promos | `igv_opcional_segun_factura` | Neto | Igual que Chiper |
| Company (PDF) | `igv_opcional_segun_factura` | (declarado: "NO INCLUYE EL I.G.V") | Igual que Chiper |

### 1.5 Fórmulas
```
Si politica_igv = 'igv_siempre_incluido' (Tienda Publi):
    precio_con_igv = precio_publicado
    precio_base    = round(precio_publicado / 1.18, 2)

Si politica_igv = 'igv_opcional_segun_factura' (los otros 5):
    precio_base    = precio_publicado
    precio_con_igv = round(precio_publicado * 1.18, 2)
```

Verificación matemática (con datos reales de Tienda Publi):
- `S/ 6.84 INCLUIDO IGV` → `precio_con_igv = 6.84` ; `precio_base = 6.84 / 1.18 = 5.80` ✓
- `S/ 7.08 INCLUIDO IGV` → `precio_con_igv = 7.08` ; `precio_base = 6.00` (redondo, ver 1.7)

Verificación con un precio de Chiper:
- `S/250.00` → `precio_base = 250.00` ; `precio_con_igv = 250.00 * 1.18 = 295.00` ✓

### 1.6 Búsqueda con toggle (en UI)
- El usuario tiene un toggle persistente: **"mostrar precios con IGV / sin IGV"**.
- **Default: SIN IGV** (precio neto, criterio conservador y el más común en venta diaria).
- Ordenamiento por precio usa `precio_minimo_base` o `precio_minimo_con_igv` según el toggle.
- Al cambiar el toggle, los resultados pueden reordenarse (en la práctica, si todos los proveedores aplican el mismo 18%, el orden relativo no cambia; pero el modelo está preparado para proveedores con políticas distintas en el futuro).

### 1.7 Observación de la validación
Al aplicar `precio_publicado / 1.18` a precios reales de Tienda Publi, se obtienen valores notablemente redondos: `S/ 6.84` → `5.80`, `S/ 7.08` → `6.00`, `S/ 8.50` → `7.20`, `S/ 3.54` → `3.00`. Esto sugiere que **Tienda Publi fija precios "limpios" sin IGV internamente y aplica +18% al publicar**. La división por 1.18 recupera el precio base con que probablemente trabajan ellos, confirmando que es comparable con los `precio_base` de los otros 5.

---

## 2. Limpieza de precios

### 2.1 Formatos crudos encontrados
- `S/250.00` (Chiper, sin espacio)
- `S/ 36.00` (Tienda Publi, con espacio)
- `S/.X.XX` (Promoprime)
- `S/11,000.0`, `S/18,000.0` (con coma de miles)
- `S/ 6.84 INCLUIDO IGV` (con sufijo, solo Tienda Publi)
- `CONSULTAR PRECIO` (Promoprime, 3 casos detectados)
- celda vacía / `None`

### 2.2 Reglas de limpieza
```
1. Quitar prefijos: 'S/.', 'S/', 'S /' (con o sin espacio).
2. Quitar sufijos: 'INCLUIDO IGV', 'IGV', espacios laterales.
3. Quitar comas de miles: '11,000.00' → '11000.00'.
4. Convertir a NUMERIC(10,2).
5. Si después de limpiar no es numérico ('CONSULTAR PRECIO', '', None) → guardar NULL.
6. Si precio > 0 pero stock = 0 → guardar el precio igual (el stock se evalúa por separado).
```

### 2.3 Casos especiales
- **`CONSULTAR PRECIO`** (solo aparece literalmente en Promoprime, 1 caso) → `precio_unitario = NULL`, registrar el texto original en `precio_escala.etiqueta_origen` para referencia. Nota: textos como "CONSULTAR OBSERVACIONES" o "CONSULTAR RESTRICCIONES" en otras hojas son **encabezados de columna**, no valores de precio; el ETL los detecta por estar en filas-encabezado, no en filas-producto.
- **Precio negativo o cero:** se guarda como NULL (no es un precio válido); se registra en `ingesta_log.errores`.

---

## 3. Tratamiento del stock

### 3.1 Distribución real observada
| Proveedor | min | max | ceros | negativos |
|-----------|-----|-----|-------|-----------|
| Cheaper | -5 | 60,242 | 85 | 2 |
| EFStock | 0 | 98,473 | 145 | 0 |
| Promos | 0 | 178,552 | 54 | 0 |

### 3.2 Reglas
- **Stock = 0:** se conserva como 0. El producto existe en catálogo pero está agotado.
- **Stock negativo** (raro, 2 casos en Cheaper): **se guarda como 0** y se registra el valor original en `ingesta_log.errores`. Un stock negativo típicamente indica error de inventario del proveedor; tratarlo como "agotado" es la opción segura para búsqueda.
- **Stock con coma de miles** (ej. `37,639`): quitar coma y convertir a integer.
- **Texto en celda de stock** (ej. "DISPONIBLE EN NUESTROS ALMACENES" en Company PDF, "STOCK CLIENTES" en EFStock que son encabezados repetidos):
  - Encabezados repetidos ("STOCK CLIENTES", fechas) → la fila NO es un producto, se salta.
  - "DISPONIBLE EN NUESTROS ALMACENES" o estados similares → `stock = NULL` + marcar en `atributos: {"stock_estado": "<texto>"}` para que la búsqueda lo trate como "consultar disponibilidad".

### 3.3 Filtro "en stock" en búsqueda
- `stock_total > 0` (suma de variantes) marca al producto como disponible.
- Stock NULL (estado textual) NO cuenta como "en stock"; aparece en otra categoría: "consultar disponibilidad".

---

## 4. Stock en tránsito

### 4.1 Origen
- **Promoprime:** columna `En Tránsito` con valores numéricos y/o texto tipo "FECHA ESTIMADA 28 DE FEBRERO 2026".
- **Promos:** hoja entera `EN TRÁNSITO` (13 filas).
- **Los demás proveedores:** no manejan stock en tránsito.

### 4.2 Reglas
- Stock en tránsito se guarda en `variante.stock_en_transito` (separado del stock disponible).
- Si la celda contiene texto con fecha (ej. "FECHA ESTIMADA 28/02/2026"), se extrae la fecha a `variante.fecha_transito` y la cantidad a `stock_en_transito` (si está en otra celda) o `NULL` (si solo hay texto).
- **NO entra al filtro "en stock"** del Bloque 7. Puede mostrarse en la ficha del producto como información complementaria ("Próxima llegada: 500 unidades el 28/02/2026").

### 4.3 Hoja `EN TRÁNSITO` de Promos
Las 13 filas de esa hoja se cargan en la BD como productos normales, pero con `variante.stock = 0` y `variante.stock_en_transito = <cantidad>`. No se crean en una tabla aparte.

---

## 5. Escalas de precio (por cantidad)

### 5.1 Escalas reales por proveedor
| Proveedor | Escala alta | Escala media | Escala baja |
|-----------|-------------|--------------|-------------|
| Chiper | ≥500 (millar) | ≥50/100 (ciento) | ≤5 (muestra) |
| EFStock | ≥500 (millar) | ≥50 (ciento) | <50 (muestra) |
| Promoprime | ≥500 (millar) | ≥50 (ciento) | (muestra) |
| Promos | ≥500 | ≥50 | 1-49 |
| Tienda Publi | 500-1000 | 50-499 | 1-49 |
| Company | ≥1000 | 100-499 | 1-99 |

### 5.2 Mapeo a `precio_escala`
Cada escala se carga como una fila independiente con su `cantidad_minima`. Se interpreta como **"a partir de esta cantidad, el precio unitario es X"**.

| Origen | cantidad_minima | etiqueta_origen |
|--------|----------------|------------------|
| Precio por millar (≥500) | 500 | "PRECIO POR MILLAR" |
| Precio por ciento (≥50) | 50 | "PRECIO POR CIENTO" |
| Precio muestra (1-49) | 1 | "PRECIO MUESTRA" |
| 500 a 1000 (T.Publi) | 500 | "PU 500 A 1000" |
| 50 a 499 | 50 | "PU 50 A 499" |
| 1 a 49 | 1 | "1 A 49" |
| 1000+ (Company) | 1000 | "DE 1000 UND" |
| 100-499 | 100 | "DE 100 A 499 UND" |
| 1-99 | 1 | "DE 1 A 99 UNID" |

### 5.3 Regla de búsqueda por precio
- `producto.precio_minimo_base` = `MIN(precio_base)` sobre todas las escalas → precio por mayor sin IGV (default del toggle).
- `producto.precio_minimo_con_igv` = `MIN(precio_con_igv)` sobre todas las escalas → precio por mayor con IGV.
- Ambos campos se usan según el toggle del usuario.
- Para mostrar al usuario, la UI puede pedir cantidad y consultar la escala que aplica.

---

## 6. Hojas y filas que NO son productos

### 6.1 Filas a ignorar
- **Chiper:** toda la hoja `Datos Empresa` (datos de la empresa, bancos, condiciones).
- **EFStock:** filas 1 y 2 de cada hoja (título "STOCK CLIENTES" y fecha), filas con "STOCK CLIENTES" o fecha aislada (encabezados repetidos al inicio de cada hoja).
- **Promoprime:** filas de banda de categoría (texto único como "ESCRITORIO" sin más datos) y filas de encabezado repetidas al inicio de cada sección.
- **Promos:** filas vacías entre productos; encabezados repetidos.

### 6.2 Hojas especiales de Promos (NO son categorías + ESTRUCTURA DISTINTA)

Estas 3 hojas tienen **estructura de columnas diferente** a las hojas regulares y requieren un mapeo ETL específico:

- **`REMATES!`** (147 filas) — productos con descuento.
  - Columnas: `LINEA | ARTÍCULO | (CÓDIGO SISTEMA, sin encabezado claro) | IMAGEN | STOCK | A PARTIR DE 500 UND | A PARTIR DE 50 UNID | DE 1 A 49 UNID | DESCRIPCION | PRESENTACION | RESERVAS | OBSERVACIONES`.
  - Trae campo extra `RESERVAS` y notas tipo "Restricción en el envío…".
  - Carga: categoría real desde `LINEA` + flag `atributos: {"oferta": "remate"}`.
- **`EN TRÁNSITO`** (13 filas) — ya cubierto en sección 4.
- **`Ofertas`** (1055 filas) — ⚠️ es la hoja más grande de Promos, **estructura simplificada**.
  - Columnas: `LINEA | ARTÍCULO | IMAGEN (con texto "REMATON!!!", "OFERTA!!!") | STOCK | PRECIO UNIT A PARTIR DE X | DESCRIPCION | RESERVAS | OBSERVACIONES`.
  - **NO tiene `CÓDIGO SISTEMA` separado**: el código viene dentro del campo `ARTÍCULO` (ej. "TC-28 POWER BANK..."). El ETL debe extraerlo con regex `^([A-Z]+-\d+)\s`.
  - **NO tiene columna `COLOR` separada**: cuando hay color va dentro de `DESCRIPCION`.
  - **NO tiene `PRECIO POR MILLAR` separado**: trae una única columna de precio "A PARTIR DE X UNIDADES" (la cantidad mínima varía por fila; leerla del encabezado o del texto).
  - Carga: categoría real desde `LINEA` + flag `atributos: {"oferta": "promocion"}`.
  - **Riesgo de duplicado:** muchas filas de "Ofertas" son los mismos productos de las hojas regulares pero con precio rebajado. La deduplicación (Bloque 6, nivel 1) los unirá por código si lo extraemos bien.

### 6.3 Regla
El ETL detecta estas filas/hojas como **no-producto** mediante:
1. Nombre de hoja en lista de exclusión (`Datos Empresa`).
2. Fila sin código + sin precio + sin stock → ignorar.
3. Fila cuyo único contenido coincide con un nombre de categoría conocido → es banda separadora, ignorar.

---

## 7. Moneda

- **Todos los catálogos usan Soles peruanos (PEN).**
- El modelo lo trata como invariante por ahora: `proveedor.moneda = 'PEN'` para todos.
- Si en el futuro entra un proveedor en USD u otra moneda, se añadirá `precio_escala.moneda` y un campo de tipo de cambio. **No es necesario hoy.**

---

## 8. Resumen de reglas para el ETL (checklist)

El Bloque 5 (mapeo ETL por proveedor) implementará estas reglas. Resumen para que sirva de checklist:

1. ✅ Limpieza de precio → quitar S/, comas, sufijos; "CONSULTAR PRECIO" → NULL.
2. ✅ Conversión IGV según `proveedor.politica_igv`:
   - `igv_siempre_incluido` (Tienda Publi): `precio_con_igv = publicado` ; `precio_base = publicado / 1.18`.
   - `igv_opcional_segun_factura` (los otros 5): `precio_base = publicado` ; `precio_con_igv = publicado * 1.18`.
3. ✅ Stock negativo → guardar 0 + registrar en `ingesta_log.errores`.
4. ✅ Stock textual → NULL + guardar el texto en `atributos.stock_estado`.
5. ✅ Stock con coma → quitar coma y convertir a integer.
6. ✅ Stock en tránsito → `variante.stock_en_transito` (no entra a "en stock").
7. ✅ Escalas → una fila por escala en `precio_escala` con `cantidad_minima` correspondiente y ambos precios poblados.
8. ✅ `precio_minimo_base` = MIN(precio_base) y `precio_minimo_con_igv` = MIN(precio_con_igv) sobre las escalas del producto.
9. ✅ Filas no-producto (hoja Datos Empresa, encabezados repetidos, bandas) → ignorar.
10. ✅ Hojas especiales de Promos (REMATES!, Ofertas) → cargar a su categoría real + flag en atributos.

---

*Documento del Bloque 4 — validado dos veces contra archivos reales. Listo para tu revisión antes de avanzar al Bloque 8 (Imágenes) o Bloque 5 (Mapeo ETL).*
