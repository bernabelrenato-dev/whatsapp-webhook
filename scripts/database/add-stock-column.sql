-- Alterar la tabla CatalogProducts para añadir la columna stock de gestión manual
ALTER TABLE "CatalogProducts" ADD COLUMN IF NOT EXISTS "stock" INTEGER DEFAULT NULL;
