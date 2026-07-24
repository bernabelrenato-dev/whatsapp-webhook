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

---

## 📌 Registro #5: Fallo de Transacción SQL `PublicTypebot` (Columna `typebot` Inexistente) Causaba Rollback al Publicar Flujo

### 🚨 Descripción del Problema
- **Síntoma:** Al interactuar en WhatsApp seleccionando la opción *"☕ Tazas, Tomatodos & Mug"*, el bot en producción derivaba inmediatamente la conversación a un asesor humano en lugar de mostrar el nuevo sub-flujo de Mugs Térmicos de Acero por capacidad y modelo.
- **Causa Raíz:** En `scripts/publish_jgis_master_flow.js`, la consulta SQL para actualizar la tabla `"PublicTypebot"` ejecutaba `UPDATE "PublicTypebot" SET typebot = $1::jsonb ...`. La tabla `"PublicTypebot"` en PostgreSQL no posee la columna `typebot` (las columnas reales son `groups`, `events`, `edges`, `theme`, `settings`). Esta inconsistencia producía una excepción `column "typebot" of relation "PublicTypebot" does not exist` que disparaba un `ROLLBACK` de la transacción SQL completa, impidiendo que el nuevo esquema se guardara en la base de datos de producción y manteniendo activo el flujo antiguo.
- **Solución Definitiva:**
  1. Se corrigió la sentencia SQL en `scripts/publish_jgis_master_flow.js` para actualizar explícitamente `"groups" = $1::jsonb, events = $2::jsonb, edges = $3::jsonb, "updatedAt" = NOW() WHERE "typebotId" = $4`.
  2. Se configuró la auto-ejecución de `publishMasterFlow()` al arrancar `src/server.js` para que cada despliegue de producción actualice y publique de forma atómica el Flujo Maestro en la base de datos PostgreSQL de Typebot.

---

## 📌 Registro #6: Excepción Zod `No matching discriminator` por Tipo de Bloque `"picture input"` Invalidadaba `startChat` en `typebot-viewer` (Error 500)

### 🚨 Descripción del Problema
- **Síntoma:** Al enviar cualquier mensaje en WhatsApp (ej. *"inicio"*, *"termo de cafe"*), el bot respondía repetidamente con el mensaje de seguridad de fallback *"👋 ¡Hola! Un asesor comercial de Corporación JGIS te atenderá en breve. Escribe 'inicio' para reiniciar el menú."* y no desplegaba las opciones interactiva ni el sub-flujo de Mugs.
- **Causa Raíz:** El contenedor `typebot-viewer` retornaba un `HTTP 500 Internal Server Error` debido a un fallo de validación Zod Schema en la ruta `groups[36].blocks[1]`. El bloque `b_input_voucher_file` estaba definido como `"type": "picture input"`. En Typebot v6 Zod Schema, el discriminador válido para recepción de archivos/imágenes es `"type": "file input"`. La falta de discriminador válido causaba un error de parseo Zod en `typebot-viewer`, rechazando el esquema con HTTP 500.
- **Solución Definitiva:**
  1. Se corrigió el tipo de bloque en `scripts/publish_jgis_master_flow.js` de `"picture input"` a `"file input"`, e incluyó las propiedades requeridas `options.labels.button` y `options.labels.placeholder`.
  2. Se creó el script de auditoría preventiva `scripts/tools/validate_schema_zod.js` para validar automáticamente todos los discriminadores de Typebot v6 antes del despliegue.
  3. Se reinició `typebot-viewer` tras republicar el esquema corregido en PostgreSQL, confirmando respuesta **HTTP 200 OK** directa desde `startChat`.


