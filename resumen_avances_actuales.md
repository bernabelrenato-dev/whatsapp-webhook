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

## 🔮 Tareas Pendientes para Finalizar la Migración

Para que el bot de producción esté operativo en la nube, nos faltan las siguientes tareas:

*   [ ] **Paso 1: DNS del Dominio:** El usuario debe apuntar un dominio o subdominio (ej: `bot.jgispublicidad.pe`) a la IP `34.69.161.101` mediante un registro A en su registrador.
*   [ ] **Paso 2: Certificado SSL:** Generar el certificado de seguridad HTTPS para `bot.jgispublicidad.pe`.
*   [ ] **Paso 3: Sincronizar Catálogo y Flujo:** Ejecutar la carga del catálogo limpio de productos a la base de datos Postgres de producción e importar el flujo JSON en Typebot.
*   [ ] **Paso 4: Limpieza:** Eliminar el registro "Importadora JGIS (Prueba)" y actualizar la URL definitiva del webhook en el panel de Meta App.
