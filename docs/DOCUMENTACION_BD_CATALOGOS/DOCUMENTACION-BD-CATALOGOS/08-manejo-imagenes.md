# Bloque 8 — Manejo de Imágenes

**Proyecto:** Base de datos unificada de catálogos de artículos publicitarios
**Fecha:** 29 de mayo de 2026
**Estado:** ✅ Diseño completo. Apoyado en hallazgos validados de Bloques 1 y 4. Detalles técnicos de extracción marcados explícitamente como "a verificar al implementar" donde aplique.
**Depende de:** Bloque 3 (tabla `imagen` ya existe en el esquema).
**Alimenta a:** Bloque 5 (ETL ejecutará la extracción), Bloque 7 (búsqueda muestra los thumbnails).

> Las imágenes entran en el alcance del proyecto (decisión del usuario). Este bloque define cómo extraerlas de cada formato origen, dónde almacenarlas, cómo vincularlas al producto/variante y cómo usarlas en la búsqueda.

---

## 1. Inventario de imágenes por proveedor

Resumen basado en los hallazgos validados del Bloque 1 (peso de archivos, presencia de columna IMAGEN, observaciones de las celdas):

| Proveedor | Origen de la imagen | Indicador | Volumen estimado |
|-----------|---------------------|-----------|-------------------|
| Tienda Publi | **Embebidas en xlsx** | 76 MB de archivo (el más pesado, casi todo es imagen) | ~191 productos con imagen probable |
| Promos | **Embebidas en xlsx**, columna `IMAGEN` | 37 MB; tiene columna IMAGEN en hojas regulares | ~469 variantes; cobertura por confirmar |
| EFStock | **Embebidas en xlsx**, columna `IMAGEN` | 9 MB; columna IMAGEN en cada hoja | ~340 productos |
| Cheaper / Chiper | **Embebidas en xlsx**, columna `IMAGEN` | 2.8 MB c/u; imágenes más pequeñas | ~243 productos |
| Promoprime | **Embebidas en xlsx**, columna `Imagen Referencial` | 7.6 MB; una hoja única | ~143 productos |
| Company (PDF) | **Dentro del PDF**, junto al texto | 4.9 MB | por contar al extraer |

### 1.1 Hojas especiales de Promos: texto en lugar de imagen
Hallazgo del Bloque 4: en las hojas **`Ofertas`** y **`REMATES!`** de Promos, la columna IMAGEN contiene **texto** ("REMATON!!!", "OFERTA!!!") en lugar de la imagen real. El ETL debe detectar estos casos y NO tratarlos como imagen — son etiquetas visuales. Para productos de estas hojas, la imagen real (si existe) habría que buscarla por código en las hojas regulares (deduplicación nivel 1 del Bloque 6 ayuda a reusarla).

---

## 2. Estrategia de extracción por formato

### 2.1 Imágenes embebidas en xlsx
La librería **`openpyxl`** (la misma que usamos para leer texto) expone las imágenes embebidas vía `worksheet._images`. Cada imagen trae:
- Datos binarios (bytes del PNG/JPG).
- Anchor: posición de anclaje a una celda (`anchor.from_.row`, `anchor.from_.col`) o ancla flotante.

**Paso de extracción para cada hoja:**
1. Recorrer `ws._images`.
2. Para cada imagen, leer su anchor → identificar la fila a la que pertenece.
3. Esa fila ya fue parseada por el ETL principal → obtener el `producto_id` (o `variante_id` si la fila es de variante).
4. Guardar el archivo binario en disco y crear un registro en la tabla `imagen`.

**Detalles a verificar al implementar el ETL:**
- Tipo de anchor usado por cada xlsx (`oneCellAnchor`, `twoCellAnchor`, `absoluteAnchor`). Tienda Publi y Promos suelen usar `twoCellAnchor`; Cheaper/Chiper habitualmente `oneCellAnchor`. El código de extracción debe manejar las tres variantes.
- Si las celdas combinadas (ej. en Cheaper, una fila producto + varias filas variante) tienen una sola imagen en la fila superior, esa imagen aplica al producto (no a una variante específica).

### 2.2 Imágenes dentro de PDF (Company)
Para el PDF de Company se usa **`pdfplumber`** (extracción de texto + ubicación de imágenes) combinado con **`pypdfium2`** o `PyMuPDF` para extraer los bytes de las imágenes. Para cada página:
1. Extraer las imágenes con su bounding box (coordenadas en la página).
2. Extraer la tabla de texto con sus coordenadas.
3. Asociar imagen ↔ fila de la tabla por proximidad vertical (la imagen que está al lado izquierdo del texto del producto).
4. Es el formato más frágil de los 7; planificar un porcentaje de errores y un fallback (si no se logra asociar, registrar en `ingesta_log.errores` y dejar el producto sin imagen).

### 2.3 Celdas con texto en lugar de imagen
Para las hojas especiales de Promos: si la celda IMAGEN es texto (longitud > 0 y no es bytes), el ETL **no la trata como imagen** y deja al producto sin imagen propia. La deduplicación posterior (nivel 1) puede prestar la imagen del producto original si comparten código.

---

## 3. Almacenamiento

### 3.1 Decisión: filesystem local (con migración futura a S3 si crece)
**Recomendación:** almacenar las imágenes en el filesystem local del servidor, accesibles vía la aplicación web. Volumen estimado total: ~1500–2000 imágenes × ~200 KB cada una (después de optimización) ≈ **300–400 MB**. Es perfectamente manejable en disco local.

**Razones:**
- Volumen bajo para el primer año.
- Sin dependencia de servicios externos (S3, Cloudflare R2, etc.).
- Migración a S3 más adelante es trivial: solo cambia `imagen.ruta` de path local a URL externa.
- BLOB en PostgreSQL **NO** se recomienda: penaliza el rendimiento de las consultas frecuentes (búsqueda) al inflar las páginas de datos.

### 3.2 Estructura de carpetas
```
img/
├── chiper/
│   ├── original/
│   │   └── 3111.jpg
│   └── thumb/
│       └── 3111.jpg
├── efstock/
├── promos/
├── tiendapubli/
├── promoprime/
└── company/
```

### 3.3 Nomenclatura
- **Por proveedor + código:** `img/<proveedor>/original/<codigo_proveedor>.<ext>` para productos sin variante específica.
- **Por variante (Promos):** `img/promos/original/<codigo_sistema_variante>.<ext>` (Promos tiene código único por variante).
- **Tienda Publi (sin código):** usar el `producto.id` interno generado por la BD: `img/tiendapubli/original/<producto_id>.<ext>`.
- **Extensión:** preservar la original (jpg, png, gif) durante la extracción; las normalizaciones se hacen aparte (ver 4).

### 3.4 Dos tamaños por imagen
- **`original/`** — imagen completa, max 800px de ancho, calidad JPEG 85%. Para la ficha de detalle del producto.
- **`thumb/`** — thumbnail 200px ancho, calidad 80%. Para los resultados de búsqueda (donde se cargan muchas a la vez).

Generar ambos al momento de extraer, en el mismo paso del ETL.

---

## 4. Procesamiento al extraer

Pipeline por imagen:

```
1. Extraer bytes del xlsx o PDF.
2. Detectar formato real (PIL/Pillow: Image.open(bytes_io).format).
3. Convertir a RGB si viene como RGBA o CMYK (compatibilidad).
4. Redimensionar:
   - original: max(width, height) = 800px
   - thumb:    max(width, height) = 200px
   (Preserva relación de aspecto)
5. Guardar como JPEG con calidad 85 (original) y 80 (thumb).
6. Calcular MD5 del archivo final → guardarlo para detección de duplicados.
7. Insertar registro en tabla imagen.
```

### 4.1 Detección de duplicados visuales (opcional)
Aunque el código pueda no coincidir, la **misma imagen** suele aparecer en varios proveedores (foto de stock del fabricante). Estrategia opcional:
- Hash perceptual (`imagehash.phash`) por cada imagen al guardarla.
- Si el hash coincide con uno ya guardado de otro proveedor → señal de que es el mismo producto físico → alimenta `dedup_candidato` (Bloque 6).
- **No implementar en la primera versión**; agregar después si la deduplicación por nombre/código no da suficiente cobertura.

---

## 5. Vínculo producto ↔ imagen

El esquema del Bloque 3 ya tiene la tabla `imagen` con todos los campos necesarios:

| Campo | Cómo se llena |
|-------|---------------|
| `producto_id` | Siempre poblado. Apunta al producto al que pertenece. |
| `variante_id` | Solo cuando la imagen es específica de una variante (Promos por color). NULL para imagen genérica del producto. |
| `ruta` | Path relativo desde `img/`. Ej: `chiper/original/3111.jpg`. |
| `origen` | `embebida_xlsx`, `pdf`, `externa` (placeholder, p.ej. de stock). |
| `es_principal` | `true` para una sola imagen del producto. Las demás (si las hay) son galería. |

### 5.1 Regla "una principal por producto"
Si el ETL extrae 1 imagen del producto → es_principal=true.
Si extrae N imágenes (caso teórico futuro) → la primera es_principal=true, las demás false.

---

## 6. Productos sin imagen

### 6.1 Casos esperados
- Hojas especiales de Promos (Ofertas/REMATES!) donde la celda IMAGEN es texto.
- Filas mal estructuradas que el ETL no logró asociar a una imagen embebida.
- Productos importados del PDF de Company donde la asociación imagen↔fila falló.

### 6.2 Tratamiento
- **No bloquear la carga del producto.** Un producto sin imagen es válido; se muestra con placeholder.
- **Placeholder por categoría:** una imagen genérica por categoría (mug, lapicero, USB…) en `img/_placeholders/<categoria>.png`. En la UI: si `imagen` está vacío para un producto, se muestra el placeholder de su categoría.
- **Registrar en `ingesta_log.errores`:** entry tipo `{"tipo": "sin_imagen", "producto_id": 1234, "razon": "celda_texto" | "anchor_no_resuelto" | "pdf_asociacion_fallida"}`. Permite priorizar revisión manual.

---

## 7. Imágenes en la búsqueda (Bloque 7 detallará la UI)

- **Lista de resultados:** thumbnail (200px) — carga rápida, lazy loading nativo (`loading="lazy"` en `<img>`).
- **Detalle del producto:** imagen original (800px). Si hay galería, swipeable.
- **Comparación entre proveedores (producto_maestro con varias ofertas):** mostrar la imagen del producto con `es_principal=true` que tenga mayor calidad/resolución. Si distintos proveedores tienen imágenes distintas del mismo producto, mostrar todas en pequeño junto al nombre del proveedor.
- **Sin búsqueda por imagen inversa** en esta versión. Sería un proyecto aparte (modelos de visión).

---

## 8. Re-ingesta de imágenes

Al recargar un catálogo del mismo proveedor (Bloque 9):

```
Para cada imagen extraída del nuevo xlsx:
  1. Calcular MD5 de la nueva imagen.
  2. Si el producto ya tiene imagen en BD:
     a. Si MD5 nuevo == MD5 guardado → no hacer nada, mantener la actual.
     b. Si MD5 nuevo != MD5 guardado → reemplazar archivo, actualizar timestamp.
  3. Si el producto no tenía imagen → crear registro y archivo.
  4. Si el producto antes tenía imagen y el nuevo xlsx no la trae → mantener la antigua (no borrar; un xlsx incompleto no debe borrar datos).
```

La regla **"no borrar si el nuevo archivo no la trae"** es deliberada: protege contra cargas parciales o errores del proveedor.

---

## 9. Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|-----------|
| Tienda Publi tiene imágenes mal ancladas y no se puede asociar a fila | Media | Probar con muestra de 20 filas antes de cargar todo. Si falla > 5%, marcar para revisión manual y usar nombre de producto como vínculo de respaldo. |
| El PDF de Company da errores de asociación imagen↔texto | Alta (PDFs son frágiles) | Aceptar tasa de error razonable (~10%) y registrar en log. Posibilidad de cargar manualmente las imágenes que fallen. |
| Imagen demasiado grande que tras descomprimir explota memoria | Baja | Validar tamaño en bytes antes de abrir con PIL (max 20 MB por imagen). |
| Duplicación masiva de archivos por mismo producto en varios proveedores | Media | Hash perceptual opcional (sección 4.1). En primera versión: aceptar que pesen ~1.5x lo que pesarían deduplicado. |
| Imagen con marca de agua del proveedor | Alta | No quitar marcas de agua (es contenido del proveedor). Mostrar tal cual. |

---

## 10. Checklist para el ETL (Bloque 5)

1. ✅ Por cada hoja xlsx: recorrer `ws._images` y mapear cada imagen a su fila por anchor.
2. ✅ Detectar texto en celda IMAGEN (hojas Ofertas/REMATES! de Promos) y NO tratarlo como imagen.
3. ✅ Para el PDF de Company: extraer imágenes + bounding box y asociar por proximidad vertical al texto del producto.
4. ✅ Pipeline de procesamiento: bytes → PIL → RGB → resize → JPEG 85/80 → MD5.
5. ✅ Generar 2 archivos por imagen: `original/` (800px) y `thumb/` (200px).
6. ✅ Insertar registro en tabla `imagen` con `producto_id`, `variante_id` opcional, `ruta`, `origen`, `es_principal=true` para la primera.
7. ✅ Productos sin imagen → registrar en `ingesta_log.errores`, no bloquear la carga.
8. ✅ Re-ingesta: comparar MD5 antes de reemplazar; si nuevo xlsx no trae imagen, no borrar la existente.

---

## 11. Notas para confirmar al implementar

Estos puntos requieren abrir los archivos con código (no disponibles en esta sesión) y deben verificarse durante el desarrollo del ETL del Bloque 5:

- Tipo exacto de anchor de imagen usado por cada xlsx (one/two/absolute).
- Cantidad real de imágenes embebidas en Tienda Publi, Promos, EFStock, Cheaper/Chiper, Promoprime (cuento estimado vs. real).
- Si las imágenes de Tienda Publi se anclan a la **fila del producto** (cabecera) o a la **fila de descripción**. Probablemente a la cabecera, pero hay que verlo.
- Calidad y resolución promedio de las imágenes originales (decidir si 800px es suficiente o conviene mantener original).
- Existencia de imágenes en la hoja `Datos Empresa` de Cheaper (probablemente logos/banners no relevantes; el ETL los ignora porque la hoja entera se salta).

---

*Documento del Bloque 8 — diseño completo. Las decisiones técnicas están fundamentadas en hallazgos previamente validados. Los puntos marcados en sección 11 se confirman al ejecutar el ETL del Bloque 5.*