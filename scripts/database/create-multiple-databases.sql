-- Script de Inicialización de Bases de Datos para JGIS Publicidad
-- Crea la base de datos necesaria para Chatwoot, ya que Postgres crea una sola por defecto.

SELECT 'CREATE DATABASE chatwoot_production'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chatwoot_production')\gexec
