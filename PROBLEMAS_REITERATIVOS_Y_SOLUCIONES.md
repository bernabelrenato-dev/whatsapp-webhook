# 📔 Registro de Problemas Reiterativos y Soluciones Técnicas — JGIS Publicidad

Este documento registra los fallos de arquitectura, despliegue y sincronización identificados durante el desarrollo del ecosistema **JGIS Bot**, detallando su causa raíz empírica y la solución definitiva aplicada para evitar que se repitan en producción.

---

## 📌 Registro #1: Discrepancia de Código en VPS por Contenedor Docker Sin Montaje de Volúmenes (Despliegue Enmascarado)

### 🚨 Descripción del Problema
- **Síntoma:** Tras realizar un `git push origin master`, la máquina del VPS ejecutaba `git pull` en la carpeta del host, pero el bot en producción continuaba ejecutando el código antiguo en memoria y devolviendo mensajes desactualizados en Chatwoot.
- **Causa Raíz:** En `docker-compose.yml`, la definición del servicio `webhook` carecía del bloque de volúmenes compartidos (`volumes: - ./src:/app/src`). Por ello, Docker ejecutaba una imagen compilada días atrás, ignorando los archivos que se descargaban en el disco duro del servidor con `git pull`.
- **Solución Definitiva:**
  1. Se añadieron los montajes de volumen en vivo en `docker-compose.yml`:
     ```yaml
     volumes:
       - ./src:/app/src
       - ./scripts:/app/scripts
       - ./public:/app/public
     ```
  2. Se agregó el parámetro `--build` en `deploy.sh` (`docker compose up -d --build webhook`) para garantizar la recompilación forzada en cada despliegue.

---

## 📌 Registro #2: Rechazo de Mensajes Salientes desde Chatwoot CRM por Etiqueta Meta `HUMAN_AGENT` (Error #100)

### 🚨 Descripción del Problema
- **Síntoma:** Al intentar enviar un mensaje manual a un cliente desde el CRM de Chatwoot en canales de Facebook Messenger o Instagram, aparecía un recuadro rojo con el texto `(#100) Los anuncios con "HUMAN_AGENT" no pueden etiquetarse sin aprobación previa` y el mensaje marcaba `Error al enviar`.
- **Causa Raíz:** Chatwoot intentaba enviar los mensajes salientes con `messaging_type: "MESSAGE_TAG"` y la etiqueta `"HUMAN_AGENT"`. Meta exige un proceso formal de aprobación de aplicación (*App Review*) para usar esa etiqueta. Sin esa aprobación, la Graph API de Meta rechaza el envío con el error #100.
- **Solución Definitiva:**
  1. Se creó el servicio [src/services/metaGraph.service.js](file:///c:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/src/services/metaGraph.service.js) que intercepta los mensajes salientes y los despacha usando `messaging_type: "RESPONSE"`.
  2. La etiqueta `RESPONSE` está autorizada por Meta por defecto para todas las conversaciones dentro de las primeras 24 horas y **no requiere proceso de aprobación previa**, eliminando el error #100.

---

## 📌 Registro #3: Asignación Masiva de Nombre Genérico "John Doe" a Contactos de Messenger

### 🚨 Descripción del Problema
- **Síntoma:** Todos los clientes que escribían a través de anuncios de Facebook o Messenger aparecían registrados en Chatwoot con el nombre `"John Doe"`, impidiendo identificarlos desde el CRM.
- **Causa Raíz:** Meta API envía un identificador anónimo de página (PSID). Si Chatwoot no resuelve el perfil antes de crear el contacto, asigna `"John Doe"` por defecto.
- **Solución Definitiva:**
  1. El servicio `metaGraphService.resolveAndUpdateChatwootContact()` consulta automáticamente la API de Meta Graph (`GET /v19.0/${PSID}?fields=first_name,last_name`) cuando detecta un nombre `"John Doe"` o `"Cliente"`.
  2. Actualiza la ficha de contacto en Chatwoot con el **Nombre y Apellido Real del usuario en Facebook/Instagram**.

---

## 📌 Registro #4: Imagen Muestra Incoherente en referral (`3115.jpg` vs Gorra Trucker Real)

### 🚨 Descripción del Problema
- **Síntoma:** La vista previa del anuncio en la nota de atribución de Meta Ads mostraba una foto de lapiceros/multicargadores en lugar de una gorra.
- **Causa Raíz:** La URL de la imagen de prueba (`media_url`) estaba apuntando al archivo `3115.jpg` (lapiceros de catálogo) en lugar de una imagen de gorras.
- **Solución Definitiva:** Se corrigió la referencia por `2125B.jpg`, que corresponde a la **Gorra Trucker Azul/Blanco** del catálogo de JGIS Publicidad.
