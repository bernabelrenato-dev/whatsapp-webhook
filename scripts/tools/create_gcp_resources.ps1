# ==============================================================================
# Script de Automatizacion de Recursos de GCP para Windows PowerShell
# Proyecto: JGIS Publicidad - WhatsApp Bot + Typebot + Dify.AI Stack
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "=== [1/6] Iniciando configuracion de Google Cloud Platform ===" -ForegroundColor Cyan

# 1. Verificar si gcloud CLI esta instalado
# Si se acaba de instalar en la ruta por defecto, lo agregamos al PATH de la sesion
$defaultGcloudPath = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin"
if (Test-Path "$defaultGcloudPath\gcloud.cmd") {
    $env:Path += ";$defaultGcloudPath"
}

$gcloudInstalled = $false
if (Get-Command gcloud -ErrorAction SilentlyContinue) {
    $gcloudInstalled = $true
}

if (-not $gcloudInstalled) {
    Write-Host "[*] gcloud CLI no esta instalado. Intentando instalar mediante winget..." -ForegroundColor Yellow
    try {
        winget install --id Google.BootstrappedGoogleCloudSDK --silent --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -ne 0) { throw "winget failed" }
        Write-Host "[+] gcloud CLI instalado con exito a traves de winget." -ForegroundColor Green
        Write-Host "[!] Por favor, abre una NUEVA ventana de PowerShell y ejecuta este script nuevamente para que los cambios en el PATH hagan efecto." -ForegroundColor Red
        Exit
    } catch {
        Write-Host "[-] winget fallo. Descargando el instalador oficial de Google Cloud CLI..." -ForegroundColor Yellow
        $installerPath = "$env:TEMP\GoogleCloudSDKInstaller.exe"
        (New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", $installerPath)
        Write-Host "[*] Ejecutando el instalador. Sigue los pasos en pantalla..." -ForegroundColor Yellow
        Start-Process -FilePath $installerPath -Wait
        Write-Host "[!] Por favor, una vez finalizada la instalacion, abre una NUEVA ventana de PowerShell y vuelve a ejecutar este script." -ForegroundColor Red
        Exit
    }
} else {
    Write-Host "[+] gcloud CLI ya esta instalado en el sistema." -ForegroundColor Green
}

# 2. Iniciar sesion en Google Cloud
Write-Host "`n=== [2/6] Autenticacion en Google Cloud ===" -ForegroundColor Cyan

$currentAccount = ""
try {
    $currentAccount = gcloud config get-value account -q 2>$null
} catch {}

if ($currentAccount -eq "jacksmprobinson@gmail.com") {
    Write-Host "[+] Ya autenticado como jacksmprobinson@gmail.com. Omitiendo inicio de sesion." -ForegroundColor Green
} else {
    Write-Host "[*] Se abrira una pestana en tu navegador para iniciar sesion en tu cuenta de Google Cloud." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    gcloud auth login
}

# 3. Seleccionar el Proyecto de GCP
Write-Host "`n=== [3/6] Seleccion de Proyecto ===" -ForegroundColor Cyan
Write-Host "[*] Cargando lista de proyectos disponibles..." -ForegroundColor Yellow
gcloud projects list

$projectId = Read-Host "`n[?] Por favor, copia y pega el PROJECT_ID del proyecto donde quieres crear el servidor"
if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Error "El ID del proyecto no puede estar vacio."
}

gcloud config set project $projectId

# 4. Habilitar la API de Compute Engine
Write-Host "`n=== [4/6] Habilitando API de Compute Engine ===" -ForegroundColor Cyan
Write-Host "[*] Esto puede tardar hasta 1 minuto si el proyecto es nuevo..." -ForegroundColor Yellow
gcloud services enable compute.googleapis.com

# 5. Configurar Redes e IP Estatica
Write-Host "`n=== [5/6] Creando IP Estatica Externa ===" -ForegroundColor Cyan
$region = "us-central1"
$zone = "us-central1-a"

# Preguntar si desea cambiar la region
$changeRegion = Read-Host "[?] Deseas usar la region predeterminada 'us-central1' (Iowa)? (s/n, por defecto 's')"
if ($changeRegion -eq "n" -or $changeRegion -eq "no") {
    $region = Read-Host "[?] Ingresa la region deseada (ej. us-east1, southamerica-east1)"
    $zone = "${region}-a"
}

Write-Host "[*] Reservando IP estatica en la region $region..." -ForegroundColor Yellow
try {
    gcloud compute addresses create jgis-static-ip --region=$region --format="value(address)"
} catch {
    Write-Host "[!] La IP jgis-static-ip ya existe o hubo un problema al crearla. Intentando obtener la IP existente..." -ForegroundColor Yellow
}

$staticIp = gcloud compute addresses describe jgis-static-ip --region=$region --format="value(address)"
Write-Host "[+] IP Estatica Reservada: $staticIp" -ForegroundColor Green

# 6. Crear la Instancia de VM Potente (e2-standard-8: 8 vCPUs, 32GB RAM)
Write-Host "`n=== [6/6] Creando Servidor VM Potente ===" -ForegroundColor Cyan
$machineType = "e2-standard-8"
$diskSize = "100GB"

$confirmSize = Read-Host "[?] Crearemos un servidor 'e2-standard-8' (8 vCPUs, 32 GB RAM, 100 GB SSD). Deseas continuar con este tamano? (s/n, por defecto 's')"
if ($confirmSize -eq "n" -or $confirmSize -eq "no") {
    Write-Host "[*] Tamanos recomendados:" -ForegroundColor Yellow
    Write-Host "  - e2-standard-4 : 4 vCPUs, 16 GB RAM" -ForegroundColor Yellow
    Write-Host "  - e2-standard-8 : 8 vCPUs, 32 GB RAM (Recomendado)" -ForegroundColor Yellow
    $machineType = Read-Host "[?] Ingresa el tipo de maquina deseado"
}

Write-Host "[*] Creando instancia 'jgis-chatbot-server' con Ubuntu 22.04 LTS..." -ForegroundColor Yellow
gcloud compute instances create jgis-chatbot-server `
    --zone=$zone `
    --machine-type=$machineType `
    --image-project=ubuntu-os-cloud `
    --image-family=ubuntu-2204-lts `
    --boot-disk-size=$diskSize `
    --boot-disk-type=pd-balanced `
    --address=$staticIp `
    --tags=http-server,https-server

# Crear reglas de firewall para HTTP y HTTPS si no existen
Write-Host "[*] Configurando reglas de Firewall para puertos 80 y 443..." -ForegroundColor Yellow
try {
    gcloud compute firewall-rules create default-allow-http `
        --direction=INGRESS `
        --priority=1000 `
        --network=default `
        --action=ALLOW `
        --rules=tcp:80 `
        --source-ranges=0.0.0.0/0 `
        --target-tags=http-server `
        -q
} catch {
    Write-Host "[*] La regla de firewall para HTTP ya existe o es administrada automaticamente." -ForegroundColor Gray
}

try {
    gcloud compute firewall-rules create default-allow-https `
        --direction=INGRESS `
        --priority=1000 `
        --network=default `
        --action=ALLOW `
        --rules=tcp:443 `
        --source-ranges=0.0.0.0/0 `
        --target-tags=https-server `
        -q
} catch {
    Write-Host "[*] La regla de firewall para HTTPS ya existe o es administrada automaticamente." -ForegroundColor Gray
}

Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host " SERVIDOR CREADO CON EXITO!" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host " Detalles del Servidor:" -ForegroundColor Green
Write-Host "  - IP Publica Estatica: $staticIp" -ForegroundColor Yellow
Write-Host "  - Tipo de Instancia: $machineType" -ForegroundColor Yellow
Write-Host "  - Ubicacion: $zone" -ForegroundColor Yellow
Write-Host "`n PROXIMOS PASOS:" -ForegroundColor Green
Write-Host " 1. Configura tu dominio DNS agregando un registro tipo A apuntando a la IP: $staticIp" -ForegroundColor Cyan
Write-Host " 2. Para conectarte por SSH al servidor, puedes ejecutar el siguiente comando:" -ForegroundColor Cyan
Write-Host "    gcloud compute ssh jgis-chatbot-server --zone=$zone" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Green
