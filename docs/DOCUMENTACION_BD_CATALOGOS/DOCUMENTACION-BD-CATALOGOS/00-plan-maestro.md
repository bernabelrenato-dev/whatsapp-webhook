# Plan Maestro — Documentación del Proyecto

**Proyecto:** Base de datos unificada de catálogos de artículos publicitarios, optimizada para búsqueda rápida de productos.
**Fecha:** 28 de mayo de 2026
**Alcance acordado:** Diseño de base de datos + búsqueda. Re-ingesta contemplada en el diseño (catálogos llegan periódicamente) pero SIN automatización por ahora. Las imágenes de producto SÍ entran en el alcance.

---

## Decisiones tecnológicas

- **Base de datos y búsqueda: PostgreSQL** con extensiones `pg_trgm` (trigramas, tolerancia a typos y búsqueda parcial) y full-text search nativo en español (índices GIN).
- **Justificación:** volumen pequeño (~5,000-10,000 productos unificados estimados), un solo sistema que reduce complejidad, y capacidad sobrada para texto + filtros + relevancia a esta escala.
- **Puerta abierta:** migrar/añadir un motor dedicado (Meilisearch o Typesense) más adelante si crece el volumen o se requiere autocompletado instantáneo tipo Algolia. El modelo de datos se diseña para permitirlo sin rehacerlo.

---

## Estructura de bloques

### Diseño base
1. **Resumen comparativo de fuentes** — ✅ COMPLETADO (validado 2 veces contra archivos reales). Archivo: `01-resumen-comparativo-fuentes-FINAL.md`
2. **Diccionario de datos unificado** — campos canónicos del modelo destino (nombre, tipo, obligatoriedad, ejemplo, reglas).
3. **Esquema / ERD + DDL** — tablas (proveedor, categoría, producto, variante, precio_escala, atributos, imagen), relaciones, índices para búsqueda rápida.
4. **Reglas de negocio y normalización** — IGV, moneda, escalas de precio, stock disponible vs. tránsito.
5. **Reglas de mapeo ETL por proveedor** — una receta por formato: Chiper, EFStock, Tienda Publi, Promos, Promoprime, Company (PDF).

### Bloques añadidos (sistema completo)
6. **Normalización de vocabularios y deduplicación** — unificar colores (AZUL/NAVY/AZUL MARINO → un valor), equivalencias de categorías entre proveedores, detección de productos duplicados entre catálogos. *Recomendado hacerlo antes o junto al Bloque 4.*
7. **Estrategia de búsqueda y rendimiento** — el objetivo central. Configuración de Postgres FTS + pg_trgm, índices, relevancia, tolerancia a typos, sinónimos (tomatodo=botella=cilindro), filtros (color/precio/categoría/stock), autocompletado.
8. **Manejo de imágenes** — extracción (especialmente de TIENDA PUBLI, 76 MB con imágenes embebidas), almacenamiento, vínculo producto↔imagen, uso en resultados. *Puede ir en paralelo, es independiente.*
9. **Diseño de re-ingesta (manual, repetible)** — qué hacer al llegar un catálogo nuevo: upsert por código, versionado de stock/precio, productos descontinuados. Proceso documentado, no automatizado.
10. **QA y casos límite** — registro de decisiones sobre datos sucios (CONSULTAR PRECIO, stock negativo, sin precio/color) y métricas para validar cada carga (esperados vs. cargados).

---

## Orden de ejecución sugerido

1. Bloque 2 (Diccionario)
2. Bloque 6 (Vocabularios/dedup) — informa al esquema
3. Bloque 3 (Esquema/DDL)
4. Bloque 4 (Reglas de negocio)
5. Bloque 8 (Imágenes) — puede solaparse
6. Bloque 5 (Mapeo ETL)
7. Bloque 7 (Búsqueda y rendimiento)
8. Bloque 9 (Re-ingesta)
9. Bloque 10 (QA y casos límite)

---

## Reglas de trabajo acordadas

- Todos los documentos que genera Claude van en `DOCUMENTACION-BD-CATALOGOS/`, separados de los catálogos originales.
- Los 7 catálogos originales son de **solo lectura**. Nunca se escriben ni modifican.
- Cada bloque se valida contra los archivos reales antes de darlo por cerrado.

---

*Plan maestro vivo. Se actualiza si cambia el alcance o se reordenan bloques.*
