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

if [[ "$PREVIOUS_SHA" == "$NEW_SHA" ]]; then
  log "INFO: No hay cambios nuevos. Nada que deployar."
  exit 0
fi

# --- Rebuild y actualización de contenedores ---
log "Rebuilding servicio '$SERVICE' y actualizando Chatwoot..."
docker compose -p whatsapp-bot -f "$COMPOSE_FILE" up -d --build "$SERVICE" chatwoot-web chatwoot-worker 2>&1 || {
  log "FAIL: docker compose build falló. Intentando rollback..."
  git checkout "$PREVIOUS_SHA" 2>/dev/null
  docker compose -p whatsapp-bot -f "$COMPOSE_FILE" up -d --build "$SERVICE" chatwoot-web chatwoot-worker 2>&1
  log "ROLLBACK: Revertido a $PREVIOUS_SHA"
  exit 1
}

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
