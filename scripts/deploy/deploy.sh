#!/bin/bash
# ==============================================================================
# Deploy Script — JGIS Publicidad (WhatsApp Bot)
# Ejecuta: git pull + docker compose rebuild del webhook
# Llamado por webhook-listener.js tras recibir push de GitHub
# ==============================================================================

set -euo pipefail

# Permite operaciones de git dentro del contenedor Docker independientemente del owner del directorio
git config --global --add safe.directory "*" 2>/dev/null || true

if [[ -d "/project" ]]; then
  PROJECT_DIR="/project"
else
  PROJECT_DIR="/home/jgis/whatsapp-bot"
fi
COMPOSE_FILE="docker-compose.yml"
SERVICE="webhook"
CONTAINER="jgis-webhook"
HEALTH_TIMEOUT=60
LOG_PREFIX="[DEPLOY]"

log() {
  echo "${LOG_PREFIX} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

# --- Guardarraíl CogSec: solo operar dentro del directorio del proyecto ---
if [[ ! -d "$PROJECT_DIR" ]]; then
  log "FATAL: $PROJECT_DIR no existe. Abortando."
  exit 1
fi

cd "$PROJECT_DIR"

# --- Guardar SHA actual para rollback ---
PREVIOUS_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
log "SHA actual antes de pull: $PREVIOUS_SHA"

# --- Git Pull ---
log "Ejecutando git pull origin master..."
git pull origin master 2>&1 || {
  log "FAIL: git pull falló. Estado del repo puede estar sucio."
  exit 1
}

NEW_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
log "SHA después de pull: $NEW_SHA"

# --- Rebuild y actualización de contenedores ---
log "Rebuilding servicio '$SERVICE' y actualizando Chatwoot..."
docker compose -p whatsapp-bot -f "$COMPOSE_FILE" up -d --build "$SERVICE" chatwoot-web chatwoot-worker 2>&1 || true

# --- Limpieza y actualización de FB_APP_ID en Chatwoot DB y Redis ---
log "Actualizando FB_APP_ID en Chatwoot DB y borrando caché..."
POSTGRES_CONTAINER=$(docker ps -q -f name=postgres | head -n 1)
CHATWOOT_CONTAINER=$(docker ps -q -f name=chatwoot-web | head -n 1)
REDIS_CONTAINER=$(docker ps -q -f name=redis | head -n 1)

if [[ -n "$POSTGRES_CONTAINER" ]]; then
  log "Limpiando installation_configs en Postgres ($POSTGRES_CONTAINER)..."
  docker exec "$POSTGRES_CONTAINER" psql -U postgres -d chatwoot_production -c "DELETE FROM installation_configs WHERE name ILIKE '%fb%';" 2>&1 || true
  docker exec "$POSTGRES_CONTAINER" psql -U postgres -d chatwoot_production -c "INSERT INTO installation_configs (name, serialized_value, created_at, updated_at) VALUES ('FB_APP_ID', '--- ''963093566323818'''::text, NOW(), NOW()), ('FB_APP_SECRET', '--- ''d81ecfc8601b990cb9a67970f167736a'''::text, NOW(), NOW()), ('FB_VERIFY_TOKEN', '--- ''jgis_verify_token_messenger_2026'''::text, NOW(), NOW());" 2>&1 || true
fi

if [[ -n "$CHATWOOT_CONTAINER" ]]; then
  log "Ejecutando Rails GlobalConfig.clear_cache en Chatwoot ($CHATWOOT_CONTAINER)..."
  docker exec "$CHATWOOT_CONTAINER" bundle exec rails runner "GlobalConfig.clear_cache" 2>&1 || true
fi

if [[ -n "$REDIS_CONTAINER" ]]; then
  log "Limpiando caché en Redis ($REDIS_CONTAINER)..."
  docker exec "$REDIS_CONTAINER" redis-cli FLUSHALL 2>&1 || true
fi

docker restart chatwoot-web chatwoot-worker 2>&1 || true

# --- Health Check ---
log "Esperando health check del contenedor ($HEALTH_TIMEOUT segundos)..."
SECONDS_WAITED=0
while [[ $SECONDS_WAITED -lt $HEALTH_TIMEOUT ]]; do
  # Verificar que el contenedor esté corriendo
  STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "missing")
  if [[ "$STATUS" == "running" ]]; then
    # Intentar un HTTP request al health endpoint
    HEALTH=$(docker exec "$CONTAINER" wget -q -O- http://localhost:3000/health 2>/dev/null || echo "fail")
    if [[ "$HEALTH" != "fail" ]]; then
      log "OK: Contenedor $CONTAINER está healthy."
      break
    fi
  fi
  sleep 2
  SECONDS_WAITED=$((SECONDS_WAITED + 2))
done

if [[ $SECONDS_WAITED -ge $HEALTH_TIMEOUT ]]; then
  log "FAIL: Health check timeout. Rollback..."
  git checkout "$PREVIOUS_SHA" 2>/dev/null
  docker compose -p whatsapp-bot -f "$COMPOSE_FILE" up -d --build "$SERVICE" 2>&1
  log "ROLLBACK: Revertido a $PREVIOUS_SHA"
  exit 1
fi

# --- Sincronizar configuración de REGE (OpenClaw / DeepSeek) ---
if [[ -f "$PROJECT_DIR/scripts/setup_openclaw_deepseek.py" ]]; then
  log "Actualizando configuración de OpenClaw/DeepSeek en REGE..."
  python3 "$PROJECT_DIR/scripts/setup_openclaw_deepseek.py" 2>&1 || true
  log "Limpiando archivos de bloqueo de sesión estancados (.lock) en OpenClaw..."
  docker exec jgis-openclaw sh -c "rm -f /home/node/.openclaw/agents/main/sessions/*.lock" 2>&1 || true
  docker restart jgis-openclaw 2>&1 || true
fi

# --- Limpieza de imágenes huérfanas ---
log "Limpiando imágenes Docker huérfanas..."
docker image prune -f 2>&1 | tail -1

log "DEPLOY COMPLETO: $PREVIOUS_SHA → $NEW_SHA"
log "Commit info: ${DEPLOY_COMMIT_INFO:-'no info'}"
