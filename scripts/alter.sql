SELECT codigo, nombre, categoria, color FROM "CatalogProducts" WHERE nombre ILIKE '%vaso%' OR nombre ILIKE '%jarro%' OR nombre ILIKE '%mug%' LIMIT 40;
