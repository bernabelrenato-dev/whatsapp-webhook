# Bloque 6 — Normalización de Vocabularios y Deduplicación

**Proyecto:** Base de datos unificada de catálogos de artículos publicitarios
**Fecha:** 28 de mayo de 2026
**Estado:** ✅ Validado dos veces (colores y categorías confirmados reales; se corrigió 1 ejemplo inventado y se detectó desalineación de columnas en Promos)
**Depende de:** Bloque 2 (Diccionario). **Alimenta a:** Bloque 3 (Esquema/DDL).

> Este bloque define cómo unificar valores que significan lo mismo pero se escriben distinto entre proveedores. Tiene 3 partes: (1) colores, (2) categorías, (3) deduplicación de productos. Las decisiones aquí AÑADEN tablas al esquema del Bloque 3.

---

## 1. Normalización de COLORES

### 1.1 Hallazgo
Se encontraron **~90 valores de color distintos** entre los catálogos, muchos de ellos sinónimos, errores de tipeo o variantes de matiz del mismo color base. Ejemplos reales detectados:

- **Sinónimos:** PLATEADO = PLATA = SILVER · GRIS = PLOMO = GUN = GRIS-GUN · MORADO = LILA (cercanos) · TRANSPARENTE = TRANSP
- **Errores de tipeo:** TURQUESA / TURQUEZA
- **Matices del mismo base:** AZUL / AZUL OSCURO / AZUL CLARO / AZUL MATE · NEGRO / NEGRO MATE / NEGRO BRILLANTE / NEGRO TRANS · VERDE / VERDE OSCURO / VERDE CLARO / VERDE LIMON
- **No-colores:** VARIOS, NATURAL, NUDE, BAMBOO (material/genéricos)

### 1.2 Decisión de diseño
Usar un modelo de **dos niveles** con tabla de colores:

- **`color` (texto crudo)** — se guarda tal cual vino, nunca se pierde el original.
- **`color_base`** — color canónico para filtros y búsqueda (ej. "azul", "gris", "plateado").
- **`acabado`** (opcional) — matiz/textura cuando aplica (mate, brillante, oscuro, claro, transparente).

Esto permite que el usuario filtre por "azul" y encuentre AZUL, AZUL MATE y AZUL OSCURO, pero sin perder el detalle exacto.

### 1.3 Tabla de colores canónicos (propuesta inicial)
Colores base sugeridos (consolidando los reales encontrados):

`negro, blanco, azul, rojo, verde, naranja, amarillo, gris, plateado, dorado, morado, rosado, celeste, turquesa, marron, beige, fucsia, guinda, transparente, natural, multicolor`

### 1.4 Tabla de mapeo color (ejemplos reales → base)

| Valor crudo (origen) | color_base | acabado |
|----------------------|-----------|---------|
| PLATEADO / PLATA / SILVER | plateado | — |
| GRIS / PLOMO / GUN / GRIS-GUN | gris | — |
| GRIS MATE | gris | mate |
| TURQUESA / TURQUEZA | turquesa | — |
| AZUL OSCURO | azul | oscuro |
| AZUL CLARO | azul | claro |
| AZUL MATE | azul | mate |
| NEGRO MATE | negro | mate |
| NEGRO BRILLANTE | negro | brillante |
| VERDE LIMON | verde | limon |
| LILA | morado | claro |
| TRANSP / TRANSPARENTE | transparente | — |
| VARIOS / MULTICOLOR | multicolor | — |

> La tabla completa de mapeo se construirá en el ETL; aquí se fija el criterio. Valores como NATURAL, NUDE, BAMBOO se conservan como base propio (no son sinónimos de otro).

### 1.5 Hallazgo de validación: columnas desalineadas
Durante la validación se detectó que, en algunas filas de Promos, la columna COLOR contiene **valores numéricos de precio** (ej. 0.99, 4.5, 2.99). Esto indica que el índice de columna COLOR no es constante en todas las hojas/filas (filas desalineadas o columnas en distinta posición por hoja). **Implicación para el ETL (Bloque 5):** la columna COLOR debe localizarse por su encabezado en cada hoja, no por índice fijo, y debe validarse que el valor no sea numérico antes de aceptarlo como color.

---

## 2. Unificación de CATEGORÍAS

### 2.1 Hallazgo
Cada proveedor nombra sus categorías distinto (vía hojas o columna LINEA). Equivalencias claras detectadas entre los nombres reales:

| Categoría canónica | Chiper | EFStock | Promos | Tienda Publi |
|--------------------|--------|---------|--------|--------------|
| Lapiceros | 1/2/3 LAPICEROS (plast/eco/metal) | LAPICEROS DE PLASTICO / METALICOS / PUNTERO LASER | LAPICES Y LAPICEROS | (en Oficina) |
| Tomatodos | TOMATODOS-MUG | TOMATODOS | TOMATODOS | TOMATODOS |
| Mugs y termos | TOMATODOS-MUG | JARROS MUG | MUGS Y TAZAS | MUG Y TERMOS |
| Resaltadores | (en escritorio) | RESALTADORES | RESALTADORES | RESALTADORES |
| Libretas | LIBRETAS - POSITS | TACO CON POST IT | LIBRETAS | CUADERNOS Y LIBRETAS |
| Escritorio/Oficina | ART. ESCRITORIO | ART. ESCRITORIO | ART. PARA OFICINA | OFICINA Y ESCRITORIO |
| Ecológicos | 2LAPICEROS ECOLOGICOS | LINEA ECOLOGICA | ART. ECOLÓGICOS PARA OFICINA | ECOLOGICOS |
| Llaveros | LLAVEROS - HERRAMIETAS | LLAVEROS | (en Herramienteros) | LLAVEROS |
| Tecnología | ACCES. CELULAR Y PC | USB / CALCULADORAS | TECNOLOGÍA / ACCESORIOS PARA CELULAR | TECNOLOGICOS |
| Antiestrés/Salud | ART. MÉDICOS - ANTISTRESS | ART. ANTIESTRES | CUIDADO PERSONAL | SALUD Y CUIDADO PERSONAL |
| Bolsas y mochilas | (en llaveros/herram.) | BOLSAS | MOCHILAS Y BOLSOS | (en Viaje) |
| Viaje | — | ART. PLAYA | VIAJE / VERANO | ARTICULOS DE VIAJE |
| Estuches | — | ESTUCHES | FUNDAS Y ESTUCHES | (en Oficina) |
| Hogar | — | — | HOGAR | HOME |
| Sets ejecutivos | 0SETS EJECUTIVOS | — | — | (en Varios) |

### 2.2 Decisión de diseño
- Tabla `categoria` con `nombre_canonico` (unificado) + `nombre_origen` (lo que vino).
- Tabla de **mapeo categoría** (origen → canónica) que el ETL consulta. Una categoría canónica agrupa varias de origen.
- Las hojas especiales de Promos (REMATES!, EN TRÁNSITO, Ofertas) NO son categorías: son **estados/condiciones** y se tratan aparte (un flag, no una categoría).

---

## 3. Deduplicación de PRODUCTOS

### 3.1 El problema
El mismo producto físico puede aparecer en varios catálogos (ej. un USB en Company y en EFStock; un mug en 3 proveedores). Sin deduplicar, una búsqueda devuelve el mismo artículo varias veces. PERO: cada proveedor tiene su propio precio y stock, que SÍ queremos conservar para comparar.

### 3.2 Decisión de diseño: producto maestro
Introducir una entidad **`producto_maestro`** que agrupa productos equivalentes de distintos proveedores:

- `producto_maestro` (1) → (N) `producto` (la oferta de cada proveedor).
- La búsqueda muestra UN resultado por producto maestro, con la lista de proveedores y sus precios/stock debajo ("ofertas").
- Si un producto no tiene equivalente, su producto_maestro lo contiene solo a él.

> ⚠️ Esta entidad es nueva y debe añadirse al esquema del Bloque 3. Es la principal razón por la que el Bloque 6 va antes del 3.

### 3.3 Estrategia de detección (semiautomática)
La deduplicación 100% automática es arriesgada (nombres distintos para el mismo ítem). Propuesta por niveles de confianza:

1. **Alta confianza:** mismo código de producto o código de sistema entre proveedores → mismo maestro automático.
2. **Media confianza:** nombre normalizado muy similar (pg_trgm / similitud de trigramas > umbral) + misma categoría → marcar como "candidato a duplicado" para revisión.
3. **Baja confianza / manual:** se dejan separados; se pueden fusionar luego con una herramienta de revisión.

Para la primera carga se recomienda: aplicar solo nivel 1 automático, y dejar registrados los candidatos de nivel 2 en una tabla de revisión, sin fusionar a ciegas.

### 3.4 Impacto en el esquema (Bloque 3)
Tablas/campos nuevos que este bloque exige:
- Tabla `producto_maestro`.
- Campo `producto_maestro_id` (FK) en `producto`.
- Tabla `color` (catálogo de colores base) + campos `color_base`, `acabado` en `variante`.
- Tabla `categoria_mapeo` (origen → canónica).
- Tabla `dedup_candidato` (para revisión de duplicados de media confianza).

---

*Documento del Bloque 6 — validado dos veces contra archivos reales. Listo para tu revisión antes de avanzar al Bloque 3 (Esquema/DDL), que incorporará las tablas nuevas definidas aquí.*
