-- Índices recomendados para optimización de búsqueda difusa, normalización y scoring en CatalogProducts

-- Indexar código como clave primaria (implícito), pero asegurando acceso por código minúscula
CREATE INDEX IF NOT EXISTS "idx_catalog_norm_codigo" 
  ON "CatalogProducts" (translate(LOWER("codigo"), 'áéíóúÁÉÍÓÚäëïöüÄËÏÖÜñÑ', 'aeiouaeiouaeiouaeiounn'));

-- Índice de expresión para búsquedas aceleradas por nombre normalizado (sin tildes/minúsculas)
CREATE INDEX IF NOT EXISTS "idx_catalog_norm_nombre" 
  ON "CatalogProducts" (translate(LOWER("nombre"), 'áéíóúÁÉÍÓÚäëïöüÄËÏÖÜñÑ', 'aeiouaeiouaeiouaeiounn'));

-- Índice de expresión para categoría normalizada
CREATE INDEX IF NOT EXISTS "idx_catalog_norm_categoria" 
  ON "CatalogProducts" (translate(LOWER("categoria"), 'áéíóúÁÉÍÓÚäëïöüÄËÏÖÜñÑ', 'aeiouaeiouaeiouaeiounn'));

-- Índice de expresión para color normalizado
CREATE INDEX IF NOT EXISTS "idx_catalog_norm_color" 
  ON "CatalogProducts" (translate(LOWER("color"), 'áéíóúÁÉÍÓÚäëïöüÄËÏÖÜñÑ', 'aeiouaeiouaeiouaeiounn'));

-- Índice de expresión para proveedor normalizado
CREATE INDEX IF NOT EXISTS "idx_catalog_norm_proveedor" 
  ON "CatalogProducts" (translate(LOWER("proveedor"), 'áéíóúÁÉÍÓÚäëïöüÄËÏÖÜñÑ', 'aeiouaeiouaeiouaeiounn'));

-- Extensión opcional Trigram de PostgreSQL para acelerar operador ILIKE %term% en tablas de gran escala
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "idx_catalog_trgm_nombre" 
  ON "CatalogProducts" USING gin ("nombre" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_catalog_trgm_categoria" 
  ON "CatalogProducts" USING gin ("categoria" gin_trgm_ops);
