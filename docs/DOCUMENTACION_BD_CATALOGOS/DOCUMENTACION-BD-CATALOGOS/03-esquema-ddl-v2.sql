-- =====================================================================
-- Bloque 3 — Esquema de base de datos (DDL para PostgreSQL)
-- Proyecto: Base de datos unificada de catálogos de artículos publicitarios
-- Fecha: 28 de mayo de 2026
-- Motor: PostgreSQL 14+ (usa generated columns y jsonb)
-- =====================================================================

-- Extensiones requeridas (para búsqueda; detalle en Bloque 7)
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- trigramas: tolerancia a typos y búsqueda parcial
CREATE EXTENSION IF NOT EXISTS unaccent;       -- quitar tildes en búsqueda

-- =====================================================================
-- 1. TABLAS DE CATÁLOGO / DICCIONARIO
-- =====================================================================

-- 1.1 Proveedor (origen del catálogo)
CREATE TABLE proveedor (
    id                    SERIAL PRIMARY KEY,
    nombre                TEXT NOT NULL UNIQUE,
    nombre_archivo        TEXT NOT NULL,
    ruc                   TEXT,
    politica_igv          TEXT NOT NULL DEFAULT 'igv_opcional_segun_factura'
                          CHECK (politica_igv IN ('igv_siempre_incluido', 'igv_opcional_segun_factura', 'igv_siempre_excluido')),
    fecha_catalogo        DATE,
    moneda                TEXT NOT NULL DEFAULT 'PEN',
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 Categoría unificada
CREATE TABLE categoria (
    id                    SERIAL PRIMARY KEY,
    nombre_canonico       TEXT NOT NULL UNIQUE,
    descripcion           TEXT
);

-- 1.3 Mapeo de categorías de origen → canónica
CREATE TABLE categoria_mapeo (
    id                    SERIAL PRIMARY KEY,
    proveedor_id          INTEGER NOT NULL REFERENCES proveedor(id) ON DELETE CASCADE,
    nombre_origen         TEXT NOT NULL,
    categoria_id          INTEGER NOT NULL REFERENCES categoria(id),
    UNIQUE (proveedor_id, nombre_origen)
);

-- 1.4 Colores canónicos (color_base)
CREATE TABLE color (
    id                    SERIAL PRIMARY KEY,
    nombre_base           TEXT NOT NULL UNIQUE   -- ej: 'azul', 'gris', 'plateado'
);

-- 1.5 Mapeo de colores de origen → color base
CREATE TABLE color_mapeo (
    id                    SERIAL PRIMARY KEY,
    valor_crudo           TEXT NOT NULL UNIQUE,  -- ej: 'AZUL MARINO', 'SILVER', 'PLOMO'
    color_id              INTEGER NOT NULL REFERENCES color(id),
    acabado               TEXT                   -- 'mate' | 'brillante' | 'oscuro' | 'claro' | etc.
);

-- =====================================================================
-- 2. TABLAS DE PRODUCTO
-- =====================================================================

-- 2.1 Producto maestro (agrupa el mismo artículo entre proveedores)
CREATE TABLE producto_maestro (
    id                    SERIAL PRIMARY KEY,
    nombre_canonico       TEXT NOT NULL,
    categoria_id          INTEGER NOT NULL REFERENCES categoria(id),
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Producto (oferta de un proveedor)
CREATE TABLE producto (
    id                    SERIAL PRIMARY KEY,
    producto_maestro_id   INTEGER REFERENCES producto_maestro(id) ON DELETE SET NULL,
    proveedor_id          INTEGER NOT NULL REFERENCES proveedor(id) ON DELETE CASCADE,
    categoria_id          INTEGER NOT NULL REFERENCES categoria(id),
    codigo_proveedor      TEXT,
    codigo_sistema        TEXT,
    nombre                TEXT NOT NULL,
    nombre_normalizado    TEXT,
    descripcion           TEXT,
    tipo_impresion        TEXT,
    presentacion          TEXT,
    observaciones         TEXT,
    atributos             JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Campos derivados para búsqueda rápida (se mantienen vía ETL/trigger)
    stock_total           INTEGER NOT NULL DEFAULT 0,
    precio_minimo_base    NUMERIC(10,2),              -- MIN(precio_base) sobre las escalas
    precio_minimo_con_igv NUMERIC(10,2),              -- MIN(precio_con_igv) sobre las escalas
    texto_busqueda        TSVECTOR,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (proveedor_id, codigo_proveedor)
);

-- 2.3 Variante (producto + color, con stock propio)
CREATE TABLE variante (
    id                    SERIAL PRIMARY KEY,
    producto_id           INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    color                 TEXT,                  -- texto crudo, tal como vino
    color_id              INTEGER REFERENCES color(id),
    acabado               TEXT,                  -- mate | brillante | oscuro | claro
    stock                 INTEGER NOT NULL DEFAULT 0,
    stock_en_transito     INTEGER NOT NULL DEFAULT 0,
    fecha_transito        DATE,
    codigo_sistema_variante TEXT,                -- Promos: cada color con su propio PD…
    UNIQUE (producto_id, color)
);

-- 2.4 Precio por escala (modelo flexible cantidad → precio)
CREATE TABLE precio_escala (
    id                    SERIAL PRIMARY KEY,
    producto_id           INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    cantidad_minima       INTEGER NOT NULL,
    precio_base           NUMERIC(10,2) NOT NULL,        -- precio publicado de venta normal (sin factura)
    precio_con_igv        NUMERIC(10,2) NOT NULL,        -- precio cuando se factura (con IGV 18%)
    etiqueta_origen       TEXT,                          -- 'A PARTIR DE 500 UND'
    UNIQUE (producto_id, cantidad_minima)
);

-- 2.5 Imágenes asociadas a producto
CREATE TABLE imagen (
    id                    SERIAL PRIMARY KEY,
    producto_id           INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    variante_id           INTEGER REFERENCES variante(id) ON DELETE SET NULL,
    ruta                  TEXT NOT NULL,
    origen                TEXT,           -- 'embebida_xlsx' | 'pdf' | 'externa'
    es_principal          BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 3. TABLAS DE SOPORTE
-- =====================================================================

-- 3.1 Candidatos a duplicado (revisión manual)
CREATE TABLE dedup_candidato (
    id                    SERIAL PRIMARY KEY,
    producto_a_id         INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    producto_b_id         INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    similitud             NUMERIC(5,4) NOT NULL,    -- 0.0000 a 1.0000
    razon                 TEXT,                     -- 'nombre_trigrama+categoria'
    estado                TEXT NOT NULL DEFAULT 'pendiente',  -- 'pendiente'|'confirmado'|'rechazado'
    revisado_en           TIMESTAMPTZ,
    CHECK (producto_a_id < producto_b_id)           -- evita pares duplicados (a,b)/(b,a)
);

-- 3.2 Log de ingesta (auditoría de cada carga; detalle en Bloque 10)
CREATE TABLE ingesta_log (
    id                    SERIAL PRIMARY KEY,
    proveedor_id          INTEGER NOT NULL REFERENCES proveedor(id),
    archivo               TEXT NOT NULL,
    inicio                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fin                   TIMESTAMPTZ,
    filas_leidas          INTEGER,
    productos_creados     INTEGER,
    productos_actualizados INTEGER,
    variantes_creadas     INTEGER,
    errores               JSONB NOT NULL DEFAULT '[]'::jsonb,
    estado                TEXT NOT NULL DEFAULT 'en_proceso'   -- 'en_proceso'|'completado'|'fallido'
);

-- =====================================================================
-- 4. ÍNDICES PARA BÚSQUEDA RÁPIDA
-- =====================================================================

-- Búsqueda full-text en español (detalle en Bloque 7)
CREATE INDEX idx_producto_texto_busqueda ON producto USING GIN (texto_busqueda);

-- Búsqueda por similitud / tolerancia a typos (trigramas)
CREATE INDEX idx_producto_nombre_trgm ON producto USING GIN (nombre_normalizado gin_trgm_ops);

-- Filtros frecuentes
CREATE INDEX idx_producto_categoria ON producto (categoria_id);
CREATE INDEX idx_producto_proveedor ON producto (proveedor_id);
CREATE INDEX idx_producto_maestro ON producto (producto_maestro_id);
CREATE INDEX idx_producto_stock_total ON producto (stock_total) WHERE stock_total > 0;
CREATE INDEX idx_producto_precio_minimo_base ON producto (precio_minimo_base);
CREATE INDEX idx_producto_precio_minimo_con_igv ON producto (precio_minimo_con_igv);

-- Filtros sobre variantes
CREATE INDEX idx_variante_producto ON variante (producto_id);
CREATE INDEX idx_variante_color ON variante (color_id);

-- Soporte a JSONB (atributos opcionales)
CREATE INDEX idx_producto_atributos ON producto USING GIN (atributos);

-- =====================================================================
-- 5. COMENTARIOS DE TABLA (documentación inline)
-- =====================================================================

COMMENT ON TABLE proveedor IS 'Proveedores de catálogos (Chiper, EF, Tienda Publi, Promos, Promomerch, Company).';
COMMENT ON COLUMN proveedor.politica_igv IS 'Política de IGV del proveedor. igv_siempre_incluido (Tienda Publi): el precio publicado ya trae IGV. igv_opcional_segun_factura (los otros 5): se cobra IGV solo si el cliente solicita factura; por defecto el precio publicado es neto. igv_siempre_excluido: reservado para futuros proveedores B2B que siempre facturan.';
COMMENT ON TABLE producto_maestro IS 'Agrupa el mismo producto físico ofrecido por varios proveedores. Una búsqueda muestra un resultado por maestro, con las ofertas debajo.';
COMMENT ON COLUMN producto.codigo_sistema IS 'Código de sistema único (solo Promos usa PD…). NULL para los demás.';
COMMENT ON COLUMN producto.texto_busqueda IS 'tsvector: nombre + descripción + categoría. Se actualiza vía trigger o ETL.';
COMMENT ON COLUMN producto.precio_minimo_base IS 'MIN(precio_base) sobre las escalas del producto. Usado para ordenar/filtrar cuando el toggle del usuario está en "sin IGV" (default).';
COMMENT ON COLUMN producto.precio_minimo_con_igv IS 'MIN(precio_con_igv) sobre las escalas del producto. Usado cuando el toggle está en "con IGV".';
COMMENT ON COLUMN variante.color IS 'Color tal como vino del proveedor (no se pierde). color_id apunta al color base normalizado.';
COMMENT ON TABLE precio_escala IS 'Modelo flexible: cada fila es una escala (cantidad mínima → precios). Ambos precios (base y con IGV) siempre están poblados para que la búsqueda los pueda devolver según el toggle del usuario.';
COMMENT ON COLUMN precio_escala.precio_base IS 'Precio publicado de venta normal (sin factura). Para Tienda Publi se calcula como (publicado / 1.18). Para los otros 5 proveedores es el precio publicado tal cual.';
COMMENT ON COLUMN precio_escala.precio_con_igv IS 'Precio cuando el cliente solicita factura. Para Tienda Publi es el precio publicado. Para los otros 5 se calcula como (publicado * 1.18).';
COMMENT ON TABLE dedup_candidato IS 'Pares de productos sospechosos de ser duplicados, para revisión manual antes de fusionar.';

-- =====================================================================
-- Fin del DDL — Bloque 3
-- =====================================================================
