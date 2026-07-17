#!/bin/bash

# ==============================================================================
# Script de Despliegue del Stack de IA - JGIS Publicidad (Con USER_HOME y sudo -E)
# ==============================================================================

set -e

# Exportar USER_HOME para que docker compose lo use
export USER_HOME="$HOME"
STACK_DIR="$USER_HOME/ai-agent-stack"
SESSIONS_DIR="$STACK_DIR/sessions"
ARCHIVE_DIR="$STACK_DIR/archive"

echo "=== [1/5] Preparando directorios en el host ==="
mkdir -p "$SESSIONS_DIR"
mkdir -p "$ARCHIVE_DIR"
chmod 777 "$SESSIONS_DIR"
chmod 777 "$ARCHIVE_DIR"

echo "=== [2/5] Moviendo archivos al directorio del stack ==="
mkdir -p "$STACK_DIR"
cp "$USER_HOME/agent-stack-compose.yml" "$STACK_DIR/docker-compose.yml"

# Si no existe .env, creamos uno a partir del template
if [ ! -f "$STACK_DIR/.env" ]; then
    echo "[*] Creando archivo .env inicial para el stack..."
    cp "$USER_HOME/env.agent.example" "$STACK_DIR/.env"
    echo "[!] ATENCIÓN: Por favor edita $STACK_DIR/.env con tus credenciales reales."
fi

echo "=== [3/5] Configurando el Dockerfile de openhands-mcp ==="
cp "$USER_HOME/Dockerfile.openhands-mcp" "$USER_HOME/openhands-mcp/Dockerfile"

echo "=== [4/5] Construyendo e Iniciando el Compose Stack ==="
cd "$STACK_DIR"
# Usar -E para preservar el entorno (USER_HOME) en el comando sudo
sudo -E docker compose build openhands-mcp
sudo -E docker compose up -d

echo "=== [5/5] Estado de los contenedores del stack de IA ==="
sudo -E docker compose ps

echo "=============================================================================="
echo " Stack de IA desplegado exitosamente!"
echo " Dify interactúa mediante la red interna 'docker_default'."
echo " - Puerto OpenCode-MCP (interno): 3000"
echo " - Puerto OpenHands-MCP (interno): 6363"
echo " - Puerto OpenClaw (interno/público): 8085"
echo "=============================================================================="
