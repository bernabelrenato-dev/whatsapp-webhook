# 🤖 Resumen de Estado y Avances del Proyecto - Servidor en la Nube (GCP)
# Proyecto: JGIS Publicidad (WhatsApp Bot + Typebot + Chatwoot + Dify.AI)

Este documento contiene el resumen actualizado del estado de la infraestructura en la nube y los avances técnicos del proyecto.

---

## 🏗️ Estado de la Infraestructura en la Nube (GCP)

Hemos desplegado un servidor virtual (VPS) de alto rendimiento en Google Cloud Platform con las siguientes especificaciones:

1.  **Especificaciones del Servidor (VM):**
    *   **Nombre de la Instancia:** `jgis-chatbot-server`
    *   **Ubicación (Zona):** `us-central1-a` (Iowa, EE. UU.)
    *   **Procesador (CPU):** 8 vCPUs (Núcleos virtuales)
    *   **Memoria RAM:** **32 GB de RAM** (Tipo `e2-standard-8`)
    *   **Almacenamiento:** 100 GB de disco persistente equilibrado (Balanced SSD)
    *   **Estado actual:** **RUNNING (Activo y corriendo 24/7)**

2.  **Red y Seguridad:**
    *   **Dirección IP Pública Estática:** **`34.69.161.101`** (Reservada de forma permanente para el bot, no cambia al reiniciar).
    *   **Reglas de Firewall Activas:**
        *   Puerto `22` (SSH - Acceso administrativo seguro).
        *   Puerto `80` (HTTP - Redirección a HTTPS).
        *   Puerto `443` (HTTPS - Acceso seguro con SSL).

---

## 🛠️ Estado de los Contenedores Docker (Compose Stack)

Todos los servicios del chatbot están dockerizados y activos en el servidor en la nube de 32 GB RAM:

| Contenedor | Imagen | Puerto Host | Descripción | Estado |
|---|---|---|---|---|
| `jgis-webhook` | Custom (build) | `3005` | Servidor Express del Webhook + Gemini AI | **RUNNING** |
| `typebot-builder` | baptistearno/typebot-builder | `8081` | Diseñador visual de Typebot | **RUNNING** |
| `typebot-viewer` | baptistearno/typebot-viewer | `8082` | Motor de chat de Typebot | **RUNNING** |
| `chatwoot-web` | chatwoot/chatwoot | `3010` | Bandeja omnicanal para asesores humanos | **RUNNING** |
| `chatwoot-worker` | chatwoot/chatwoot | - | Procesador de tareas de Chatwoot | **RUNNING** |
| `jgis-postgres` | postgres:15-alpine | `5432` | Base de datos para Typebot y Chatwoot | **RUNNING** |
| `jgis-redis` | redis:7-alpine | - | Cache y colas para Chatwoot | **RUNNING** |
| `jgis-mailhog` | mailhog/mailhog | `8025` | Interfaz y SMTP local en la nube | **RUNNING** |

---

## 🗺️ Mapa de Direccionamiento de Tráfico (Nginx Proxy)

Nginx (instalado en el host) está configurado en el puerto 80 para redirigir las solicitudes a los contenedores correspondientes de la siguiente manera:

```text
Por Internet (HTTP)                     Dentro del Servidor (Docker)
───────────────────                     ───────────────────────────
http://bot.jgispublicidad.pe/webhook  ──>  jgis-webhook (Puerto 3005)
http://bot.jgispublicidad.pe/api      ──>  jgis-webhook (Puerto 3005)
http://bot.jgispublicidad.pe/typebot  ──>  typebot-builder (Puerto 8081)
http://bot.jgispublicidad.pe/chatwoot  ──>  chatwoot-web (Puerto 3010)
http://bot.jgispublicidad.pe/mailhog/ ──>  jgis-mailhog (Puerto 8025)
```

*Nota: Una vez que el DNS sea propagado, Certbot migrará automáticamente estas rutas a HTTPS (puerto 443).*

---

## ✅ Tareas de Migración e Infraestructura Completadas

- [x] **Paso 1: DNS del Dominio:** Dominio `bot.jgispublicidad.pe` y subdominio `chatwoot.jgispublicidad.pe` configurados y apuntando permanentemente a la IP estática GCP `34.69.161.101`.
- [x] **Paso 2: Certificado SSL:** Certbot configurado en Nginx generando certificados SSL válidos para transporte HTTPS nativo.
- [x] **Paso 3: Sincronizar Catálogo y Flujo:** Catálogo maestro sincronizado en PostgreSQL (3,599 productos) con motor de búsqueda atómico sin downtime (`ON CONFLICT (codigo) DO UPDATE SET`).
- [x] **Paso 4: Limpieza de Entorno:** Removidas las dependencias de túneles locales efímeros (`cloudflared`, `ngrok`), configuradas las variables de entorno de producción (`NODE_ENV=production`) y sincronizado el webhook oficial con Meta App.
- [x] **Paso 5: Pipeline Git ➔ Auto-Deploy VPS:** Implementado el webhook listener (`jgis-deployer`) para despliegue inmutable directo al hacer `git push origin master`.
- [x] **Paso 6: Auditoría de Seguridad & Memoria:** Pool de conexiones PostgreSQL (`db.js`), estructuras acotadas con expiración TTL/LRU (`ttlCache.js`), validación criptográfica de firmas HMAC con `crypto.timingSafeEqual` y eliminación de I/O bloqueante.
- [x] **Paso 7: Pruebas de Estrés y Resiliencia:** 60 peticiones concurrentes ejecutadas con 100% de éxito (`200 OK`), 0 errores 500, latencia promedio de 54.7ms y consumo mínimo de RAM (43.9 MiB).

