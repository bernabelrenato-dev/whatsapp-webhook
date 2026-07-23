# Bloque 1 — Resumen Comparativo de Fuentes (VALIDADO)

**Proyecto:** Base de datos unificada de catálogos de artículos publicitarios
**Fecha de análisis:** 28 de mayo de 2026
**Estado:** ✅ Validado contra los archivos reales (descargados y abiertos con openpyxl)
**Carpeta origen:** `2026/` (Google Drive)
**Total de fuentes:** 7 catálogos (6 Excel + 1 PDF) de proveedores en Perú

> **Nota de método:** Este documento se construyó en dos rondas de validación abriendo y leyendo cada archivo real (Excel con openpyxl, PDF con extracción de texto), no a partir de vistas previas. Se corrigieron afirmaciones iniciales sobre estructura de hojas, identificación del emisor del PDF y alcance de su catálogo.

---

## 1. Inventario de fuentes

| # | Archivo | Proveedor (inferido) | Formato | Tamaño | Fecha del stock |
|---|---------|----------------------|---------|--------|-----------------|
| 1 | CHEAPER.xlsx | Chiper / Bellagio / Evenzo | Excel | 2.8 MB | Mar. 05 May 2026 |
| 2 | CHIPER.xlsx | Chiper / Bellagio / Evenzo | Excel | 2.8 MB | (10 hojas, sin `Datos Empresa`) |
| 3 | TIENDA PUBLI.xlsx | Tienda Publi | Excel | 76 MB | 22 Mar 2026 |
| 4 | PROMOPRIME.xlsx | Promomerch | Excel | 7.6 MB | Feb 2026 |
| 5 | PROMOS.xlsx | Promos | Excel | 37.7 MB | 2026 |
| 6 | EFSTOCK.xlsx | EF | Excel | 9.1 MB | 02 Mar 2026 |
| 7 | COMPANY.pdf | COMPANY (Jr. Lampa 764, Lima · RUC 20605121927) | PDF | 4.9 MB | 19 Mar 2026 |

> CHEAPER y CHIPER son del mismo proveedor (Chiper/Bellagio) y comparten las **10 hojas de productos** (mismos nombres y columnas), pero **no son idénticos**: CHEAPER incluye además una hoja inicial `Datos Empresa` (11 hojas en total), mientras que CHIPER no la trae (10 hojas). Difieren también en fecha de stock. Se tratan como un único formato de origen ("Formato Chiper").

---

## 2. Hallazgo estructural clave (CORRECCIÓN IMPORTANTE)

**La mayoría de los Excel organizan los productos en HOJAS por categoría, NO en secciones dentro de una sola hoja.** Esto simplifica mucho el ETL y permite obtener la categoría directamente del nombre de la hoja.

| Archivo | ¿Multi-hoja? | Nº de hojas | La categoría sale de… |
|---------|:------------:|:-----------:|------------------------|
| Chiper (CHEAPER/CHIPER) | ✅ Sí | CHEAPER 11 (1 datos + 10 productos) · CHIPER 10 (solo productos) | Nombre de hoja |
| EFStock | ✅ Sí | 19 | Nombre de hoja |
| Tienda Publi | ✅ Sí | 14 | Nombre de hoja |
| Promos | ✅ Sí | 19 (incluye hojas especiales) | Columna `LINEA` + nombre de hoja |
| Promoprime | ❌ No | 1 | Bandas de sección dentro de la hoja |
| Company (PDF) | — (PDF) | — | Encabezados dentro del PDF |

---

## 3. Estructura de columnas por fuente

### 3.1 Formato Chiper (CHEAPER.xlsx + CHIPER.xlsx)

**11 hojas:** `Datos Empresa`, `0SETS EJECUTIVOS`, `1LAPICEROS PLASTICOS`, `2LAPICEROS ECOLOGICOS`, `3LAPICEROS METALICOS`, `ACCES. CELULAR Y PC`, `ART. ESCRITORIO`, `ART. MÉDICOS - ANTISTRESS`, `LIBRETAS - POSITS`, `LLAVEROS - HERRAMIETAS`, `TOMATODOS-MUG`.

Encabezado de datos (idéntico en cada hoja de productos):

`CODIGO | IMAGEN | PRODUCTO | COLOR | STOCK FINAL | PRECIO POR MILLAR (≥500 und) | (col vacía) | PRECIO POR CIENTO (≥50/100 und) | PRECIO MUESTRA (máx 5 und) | DESCRIPCIÓN`

- La **primera hoja (`Datos Empresa`) NO es de productos**: contiene datos de la empresa, bancos, condiciones de venta y horarios. El ETL debe saltarla.
- Patrón producto→variante: una fila con código + datos base; las **filas siguientes solo llevan COLOR y STOCK** (variantes del mismo código, con código/producto/precio vacíos por celdas combinadas).
- **~243 códigos de producto** distribuidos en las 10 hojas de productos.
- Precios en Soles (S/), formato `S/1,400.00`. **NO incluyen IGV.**
- Venta mínima: lapiceros 100 und / artículos 50 und / muestras máx 5.

### 3.2 EFSTOCK.xlsx (EF)

**19 hojas por categoría:** `LAPICEROS DE PLASTICO`, `LAPICEROS PUNTERO LASER`, `LAPICEROS METALICOS`, `ESTUCHES`, `CALCULADORAS`, `JARROS MUG`, `TOMATODOS`, `ART. ESCRITORIO`, `LINEA ECOLOGICA`, `TARJETEROS`, `RESALTADORES`, `TACO CON POST IT`, `ART. ANTIESTRES`, `LLAVEROS`, `BOLSAS`, `ART. PERSONAL`, `ART. DE PROTECCION`, `ART. PLAYA`, `USB`.

Encabezado (en fila 3 de cada hoja, tras 2 filas de título/fecha):

`(col vacía) | CODIGO | IMAGEN | PRODUCTO | COLOR | STOCK FINAL | PRECIO x MILLAR (≥500 pzs) | PRECIO x CIENTO (≥50 pzs) | PRECIO MUESTRA (<50 pzs) | DESCRIPCION`

- Mismo patrón producto→variante que Chiper (fila con código + filas de color/stock).
- **~340 códigos de producto** en 19 hojas. Es el catálogo Excel con más SKUs distintos.
- La descripción incluye medidas, colores disponibles, sistema (retráctil) y empaque.
- Precios en Soles. **NO incluyen IGV.** (La fila 2 lo dice explícitamente: "LOS PRECIOS NO INCLUYEN IGV").

### 3.3 TIENDA PUBLI.xlsx — el más rico en metadatos

**14 hojas por categoría:** Cuadernos y Libretas, Oficina y Escritorio, Resaltadores, Tomatodos, Mug y Termos, Ecológicos, Llaveros, Home, Tecnológicos, Artículos de Viaje, Salud y Cuidado Personal, Autos y Herramientas, Varios, Liquidaciones.

Encabezado uniforme (fila 2 de cada hoja):

`PRODUCTO | DESCRIPCION x PRODUCTO | DETALLE x CAJA | COLOR | STOCK | PU 500 A 1000 | PU 50 A 499 | 1 A 49 | PROMOCIONES`

- **NO tiene columna de código de producto.** La identificación es por nombre → habrá que generar IDs internos en el ETL.
- La descripción está **partida en varias filas** bajo cada producto (Material, Medida, Capacidad, Incluye…). El precio aparece en la fila del producto.
- `DETALLE x CAJA` mezcla cantidad por caja, medida de la caja y tipo de empaque.
- **Precios YA INCLUYEN IGV** (cada celda dice "INCLUIDO IGV"). ⚠️ Único proveedor que lo incluye.
- **~191 productos con precio** (filas-cabecera de producto) + sus variantes de color. ~1,700 filas en total (incluyendo filas de descripción y de variante).

### 3.4 PROMOPRIME.xlsx (Promomerch) — única de 1 sola hoja

**1 hoja:** `Stock Promomerch (2)`. Organiza por **bandas de sección de categoría** (PROTECCIÓN, ESCRITORIO, RESALTADORES…), y **repite la fila de encabezados al inicio de cada sección** (el ETL debe detectar y saltar esas repeticiones).

Encabezado:

`Artículo | Código | Imagen Referencial | Tipo de Impresión | Descripción | Colores | X Millar (≥500 pzs) | X ciento (≥50 pzs) | Muestra | Stock | En Tránsito`

- Dos campos exclusivos de este proveedor: **`Tipo de Impresión`** (serigrafía, tampografía…) y **`En Tránsito`** (stock futuro; a veces la celda trae texto tipo "FECHA ESTIMADA 28 DE FEBRERO 2026").
- **~143 códigos de producto.**
- Precios en Soles, formato `S/.X.XX`. **NO incluyen IGV ni impresión.**
- Algunas celdas de precio dicen "CONSULTAR PRECIO".

### 3.5 PROMOS.xlsx — el más limpio para identificación

**19 hojas:** 16 de categoría (Cuidado Personal, Tecnología, Accesorios para Celular, Hogar, Herramienteros, Lápices y Lapiceros, Resaltadores, Libretas, Art. para Oficina, Art. Ecológicos para Oficina, Tomatodos, Mugs y Tazas, Mochilas y Bolsos, Verano, Viaje, Fundas y Estuches) + **3 hojas especiales: `REMATES!`, `EN TRÁNSITO`, `Ofertas`.**

Encabezado (fila 3 de cada hoja):

`LINEA | CÓDIGO | ARTÍCULO | CÓDIGO SISTEMA | IMAGEN | COLOR | STOCK | A PARTIR DE 500 UND | A PARTIR DE 50 UNID | DE 1 A 49 UNID | DESCRIPCIÓN | PRESENTACIÓN | OBSERVACIONES`

- Único con **doble código**: `CÓDIGO` (comercial, ej. `CP-23 MINI SPRAY…`) y `CÓDIGO SISTEMA` (ej. `PD00631`). El código de sistema es **único por variante** → clave natural ideal.
- **Una fila por variante de color** (cada color tiene su propio código de sistema y stock). Es el formato más limpio para el modelo producto→variante.
- **~469 códigos de sistema únicos** (cuenta a nivel variante, no producto).
- Campos extra: `LINEA` (categoría), `PRESENTACIÓN` (empaque), `OBSERVACIONES` (ofertas, notas).
- Tiene una hoja dedicada `EN TRÁNSITO` (stock futuro) separada de las hojas de stock normal.
- Precios en Soles. **NO incluyen IGV.**

### 3.6 COMPANY.pdf — catálogo general amplio

Formato PDF (tabla densa, sin estructura de columnas limpia). Emisor real al pie del documento: **COMPANY** (Jr. Lampa 764 - Of. 146, Lima · RUC 20605121927). Campos detectables:

`CÓDIGO | IMAGEN | PRODUCTO/DESCRIPCIÓN | COLOR | STOCK | PRECIO 1000 und | PRECIO 100-499 und | PRECIO 1-99 und | EMPAQUE`

- **NO es solo USB/tecnología:** es un catálogo **general muy amplio**. Incluye USB y bolígrafos con memoria, pero también power banks, parlantes Bluetooth, audífonos, soportes de celular, bolsas (Notex/algodón), llaveros, resaltadores, tomatodos, mugs/tazas, lapiceros, alcancías, sets de vino y herramientas. Es uno de los catálogos con más variantes de color por producto. ⚠️ Sus categorías se cruzan con las de otros proveedores (mugs, llaveros, lapiceros, tomatodos), lo cual es clave para el mapeo de categorías unificadas.
- Muchos productos tienen columna de COLOR (una fila por color, como Promos).
- Escalas de precio distintas: **1000 / 100–499 / 1–99** (confirmado textualmente: "DE 1000 UND / DE 100 A 499 UND / DE 1 A 99 UNID").
- Stock mezcla números con estados de texto: "DISPONIBLE EN NUESTROS ALMACENES", "EN TRANSITO", "NUEVO INGRESO", "MERCADERIA EN LIQUIDACION".
- Precios en Soles. **NO incluyen IGV** (confirmado: el documento arranca con "PRECIO EN SOLES NO INCLUYE EL I.G.V").
- Por ser PDF, requerirá extracción y limpieza especial (parseo de tabla / OCR); es el formato más difícil de los 7.

---

## 4. Matriz comparativa de campos

| Campo conceptual | Chiper | Tienda Publi | Promoprime | Promos | EFStock | Company (PDF) |
|------------------|:------:|:------------:|:----------:|:------:|:-------:|:-------------:|
| Multi-hoja por categoría | ✅ (11/10) | ✅ (14) | ❌ (1) | ✅ (19) | ✅ (19) | — (PDF) |
| Código producto | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Código de sistema único | ❌ | ❌ | ❌ | ✅ (PD…) | ❌ | ❌ |
| Nombre producto | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Categoría | hoja | hoja | sección | hoja + col | hoja | encabezado |
| Color (variante) | ✅ | ✅ | ✅ | ✅ (1 fila c/u) | ✅ | ✅ (1 fila c/u) |
| Stock | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ (texto) |
| Stock en tránsito | ❌ | ❌ | ✅ (col) | ✅ (hoja) | ❌ | ❌ |
| Precio escala alta | Millar | 500-1000 | Millar | 500+ | Millar | 1000 |
| Precio escala media | Ciento | 50-499 | Ciento | 50+ | Ciento | 100-499 |
| Precio escala baja | Muestra | 1-49 | Muestra | 1-49 | Muestra | 1-99 |
| Descripción | ✅ | ✅ (multifila) | ✅ | ✅ | ✅ | ✅ |
| Empaque/Presentación | en desc. | ✅ (Detalle x caja) | ❌ | ✅ (col) | en desc. | ✅ |
| Tipo de impresión | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **IGV en precio** | ❌ No | ✅ **Sí** | ❌ No | ❌ No | ❌ No | ❌ No |
| Moneda | PEN | PEN | PEN | PEN | PEN | PEN |
| Volumen aprox. | ~243 prod | ~191 prod | ~143 prod | ~469 variantes | ~340 prod | (por extraer) |

---

## 5. Hallazgos clave para el diseño de la base de datos

1. **Modelo Producto → Variante.** Patrón confirmado en todas las fuentes: un producto tiene varias variantes de color, cada una con su propio stock. El esquema debe separar `producto` (datos base, precios, descripción) de `variante` (color + stock). Es el núcleo del diseño y de la búsqueda rápida.

2. **El ETL es más uniforme de lo esperado.** 4 de 6 Excel (Chiper, EFStock, Tienda Publi, Promos) usan una hoja por categoría → la categoría se extrae del nombre de hoja. Solo Promoprime (bandas internas) y el PDF requieren parseo especial.

3. **Las escalas de precio no son iguales entre proveedores** (millar/ciento/muestra vs. 500-1000/50-499/1-49 vs. 1000/100-499/1-99). Hay que normalizarlas a un modelo flexible de "rangos de precio por cantidad" (cantidad mínima → precio unitario), no a 3 columnas fijas.

4. **El IGV es inconsistente.** Tienda Publi incluye IGV; el resto no. Se debe guardar un flag `precio_incluye_igv` y normalizar todo a un mismo criterio (ej. precio base sin IGV + cálculo al mostrar).

5. **La identificación de producto varía.** Promos tiene código de sistema único (ideal). Tienda Publi no tiene código (generar uno). El modelo necesita un `id` interno propio + guardar el código original del proveedor.

6. **Manejo de "stock en tránsito".** Promoprime lo tiene como columna; Promos como hoja entera. El modelo debe distinguir stock disponible vs. stock en tránsito (con posible fecha estimada de llegada).

7. **Datos "sucios" a limpiar en ETL:**
   - Precios como texto: `S/.`, `S/`, comas de miles, "CONSULTAR PRECIO", "INCLUIDO IGV" dentro de la celda.
   - Stock como texto/estado ("DISPONIBLE EN NUESTROS ALMACENES"), negativos (`-1`), con comas (`37,639`).
   - Filas de variante con celdas combinadas/vacías (heredan el código de la fila superior).
   - Descripciones partidas en varias filas (Tienda Publi).
   - Filas de encabezado repetidas por sección (Promoprime) y filas no-producto (hoja `Datos Empresa` en Chiper).

8. **Campos exclusivos valiosos:** `Tipo de Impresión` (Promoprime), `Presentación` (Promos). El modelo unificado debe almacenarlos como campos opcionales aunque otros proveedores no los tengan.

---

## 6. Recomendación de orden para los siguientes bloques

1. **Bloque 2 — Diccionario de datos unificado** (campos canónicos del modelo destino).
2. **Bloque 3 — Esquema/ERD + DDL** (tablas: proveedor, categoria, producto, variante, precio_escala, atributos).
3. **Bloque 4 — Reglas de negocio y normalización** (IGV, colores, escalas, moneda, stock disponible vs. tránsito).
4. **Bloque 5 — Reglas de mapeo ETL por proveedor** (una receta por formato: Chiper, EFStock, Tienda Publi, Promos, Promoprime, Company PDF).

---

*Documento del Bloque 1 — versión validada contra archivos reales. Listo para tu revisión antes de avanzar al Bloque 2.*
