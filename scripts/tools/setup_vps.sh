#!/bin/bash

# ==============================================================================
# Script de Configuración Inicial para VPS en Google Cloud Platform (Ubuntu)
# Proyecto: JGIS Publicidad - WhatsApp Bot + Typebot + Dify.AI Stack
# ==============================================================================

# Detener el script si ocurre algún error
set -e

echo "=== [1/5] Actualizando el sistema de paquetes ==="
sudo apt-get update && sudo apt-get upgrade -y

echo "=== [2/5] Instalando dependencias básicas ==="
sudo apt-get install -y \
    curl \
    git \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    ufw

echo "=== [3/5] Instalando Docker y Docker Compose ==="
# Descargar e instalar llave GPG oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Configurar el repositorio APT
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Iniciar y habilitar Docker
sudo systemctl start docker
sudo systemctl enable docker

# Agregar el usuario actual al grupo docker
sudo usermod -aG docker $USER

echo "=== [4/5] Instalando Node.js (v20 LTS) y PM2 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

echo "=== [5/5] Instalando Nginx y Certbot ==="
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Habilitar e iniciar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

echo "=== Configurando el Firewall (UFW) ==="
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "=============================================================================="
echo " ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!"
echo "=============================================================================="
echo "Docker, Node.js (v20), PM2, Nginx y Certbot están listos."
echo "Por favor, cierra sesión y vuelve a entrar por SSH para aplicar los cambios de grupo de Docker (usermod)."
echo "=============================================================================="
