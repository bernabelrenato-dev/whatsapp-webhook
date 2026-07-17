-- Crear la tabla de productos del catálogo de merchandising si no existe
CREATE TABLE IF NOT EXISTS "CatalogProducts" (
    "codigo" VARCHAR(100) PRIMARY KEY,
    "nombre" VARCHAR(255) NOT NULL,
    "precio_venta" NUMERIC(10, 2) NOT NULL,
    "color" VARCHAR(100),
    "categoria" VARCHAR(100),
    "proveedor" VARCHAR(100),
    "imagen_url" VARCHAR(500),
    "sincronizado_at" TIMESTAMP DEFAULT NOW()
);

-- Indexar por categoría para búsquedas rápidas
CREATE INDEX IF NOT EXISTS "idx_catalog_category" ON "CatalogProducts" ("categoria");
