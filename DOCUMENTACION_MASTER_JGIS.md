# 📘 DOCUMENTACIÓN MASTER: Directrices, Agentes, Protocolos y Estándares — JGIS Publicidad

Este documento unifica y consolida de forma integral **todas las directrices de desarrollo, reglas de agentes IA, arquitectura de la infraestructura, protocolos de despliegue y bitácora de soluciones** para el proyecto **JGIS Bot / WhatsApp Webhook**.

---

## 1. 🏗️ Ficha Técnica de la Infraestructura en la Nube (GCP)

* **Servidor Virtual (VM):** `jgis-chatbot-server`
* **Ubicación:** Google Cloud Platform (`us-central1-a`)
* **Especificaciones:** 8 vCPUs, 32 GB RAM (`e2-standard-8`), 100 GB SSD Equilibrado.
* **IP Estática Pública:** `34.69.161.101`
* **Dominios del Ecosistema:**
  * Subdominio Bot / Webhook: `bot.jgispublicidad.pe`
  * Subdominio Dify / Orquestador: `dify.jgispublicidad.pe`

### Stack de Contenedores Docker (Compose Stack)

| Contenedor | Imagen | Puerto Host | Descripción | Estado |
|---|---|---|---|---|
| `jgis-webhook` | Custom (build) | `3005` | Webhook Express + Meta API + Gemini AI | **RUNNING** |
| `typebot-builder` | baptistearno/typebot-builder | `8081` | Diseñador visual de Typebot v6 | **RUNNING** |
| `typebot-viewer` | baptistearno/typebot-viewer | `8082` | Motor ejecutor de chat Typebot | **RUNNING** |
| `chatwoot-web` | chatwoot/chatwoot | `3010` | Bandeja omnicanal para asesores humanos | **RUNNING** |
| `chatwoot-worker` | chatwoot/chatwoot | - | Procesador de colas de Chatwoot | **RUNNING** |
| `jgis-postgres` | postgres:15-alpine | `5432` | Base de datos principal (Typebot/Chatwoot/Catálogo) | **RUNNING** |
| `jgis-redis` | redis:7-alpine | - | Cache y colas para Chatwoot | **RUNNING** |
| `jgis-mailhog` | mailhog/mailhog | `8025` | SMTP y visualización de emails de prueba | **RUNNING** |

---

## 2. 🛡️ Directrices de Seguridad Cognitiva (CogSec) y Control de Daños

1. **Radio de Acción Limitado:** Los agentes autónomos operan en modo headless (auto-aprobación). Tienen estrictamente prohibido realizar cualquier acción fuera del directorio del proyecto (`/workspace` o `/app`).
2. **Comandos Prohibidos:**
   * No ejecutar `rm -rf` sobre directorios raíz o fuera del proyecto.
   * No instalar software a nivel de sistema del host (todas las dependencias adicionales deben ser locales o dockerizadas).
   * No exponer puertos al exterior de forma manual utilizando comandos de red del host.
3. **Auditoría de Dependencias:** Todos los wrappers y librerías externas son dependencias auditables. Se prohíbe el uso de versiones `latest` o fuentes no oficiales sin verificación y fijación previa de tags.

---

## 3. ⚙️ Calidad de Código, Modo Loop y Disciplina Senior

* **Enfoque de Causa Raíz:** Ante cualquier error, bug o fallo en pruebas, el agente debe investigar la causa original en lugar de aplicar parches superficiales o "wrappers" de código sobre el síntoma.
* **Modo Bucle / Loop Ininterrumpido (ECC):**
  * Todo desarrollo, refactorización o solución de errores se ejecuta de forma autónoma sin detenerse a preguntar al usuario entre pasos, iterando hasta lograr `EXIT CODE 0`.
* **Preservación de Estructura:** No mover, renombrar ni crear directorios principales sin alinear con la arquitectura (`src`, `scripts`, `.agents`, `docs`).
* **Disciplina de Ingeniería Senior:**
  1. Lee el código existente antes de asumir su comportamiento.
  2. Plantea el plan en 2-3 líneas antes de modificar.
  3. Si no estás seguro de una API o firma de función, investiga primero.
  4. Ejecuta o describe cómo correr las pruebas relevantes.
  5. Lista los archivos modificados y el motivo de cada cambio.
  6. Nunca apliques parches temporales.

---

## 4. 🔴 Verificación Obligatoria de Entorno (Regla de Producción)

Antes de reportar cualquier fix o tarea como completada, se debe confirmar explícitamente y por escrito:
* **(a)** El archivo modificado corresponde al path real que corre en producción.
* **(b)** El cambio fue desplegado (`git push main`, build completado y healthcheck en verde).
* **(c)** La prueba se ejecutó contra el endpoint real de producción en GCP con un payload real o fielmente simulado.

Si no se pueden verificar **(a)**, **(b)** o **(c)**, debe ser reportado explícitamente.

---

## 5. 🚦 Fase Actual de Desarrollo y Arquitectura de Enrutamiento (Omniflujo Conversacional)

* **Estado Vigente:** **Fase 1 (Typebot v6 como Motor Único Temporal)**.
* **Regla Activa:** Cero respuestas por LLM en producción. `sessionState = 'typebot'` permanece forzado en `src/services/message.service.js` intencionalmente.
* **Arquitectura Objetivo (Fase 2):** Enrutamiento de 3 capas:
  1. **Capa 1: Typebot v6 (Filtro inicial y captura de datos):** Saludo, menú interactivo y selección de categoría.
  2. **Capa 2: IA (Gemini / DeepSeek):** Consultas libres y soporte tras finalizar Typebot.
  3. **Capa 3: Humano (Chatwoot):** Traspaso a asesores humanos ante intenciones de compra explícitas o solicitud de atención personalizada.

### Especificaciones del Omniflujo Multicategoría

1. **Estructura de Categorías en Typebot v6:**
   * 🧢 **Gorras Trucker:** ✅ Operativo (Plantilla de flujo base).
   * ☕ **Mugs Térmicos de Acero:** ✅ Construido y desplegado (Filtro de 2 pasos: Capacidad ➔ Diseño/Modelo con foto ➔ Cantidad ➔ Cierre).
   * 🍶 **Tomatodos de Acero:** ✅ Operativo.
   * 🖊️ **Lapiceros (Plásticos y Metálicos):** ✅ Operativo.
   * 📘 **Libretas:** ✅ Operativo.
   * 🎒 **Bolsas Notex y Cambrell:** ✅ Operativo.

2. **Entrada Híbrida (Menú + Texto Libre):**
   * El cliente puede navegar por botones de menú o escribir en texto libre (ej. *"termo de café"*, *"mug mediano 500ml"*).
   * El resolutor inteligente de botones (`Text-to-Button Choice Resolver`) mapea automáticamente la intención al sub-flujo correspondiente.

3. **Segmentación de Cierre Commercial:**
   * **1 a 12 unidades sin personalización adicional:** Cierre automático con resumen de pedido, cotización por escala y pasarela de pago (BCP/Yape) + solicitud de comprobante.
   * **13+ unidades o personalización (grabado láser / impresión especial):** Handover inmediato a asesor humano en Chatwoot adjuntando el resumen del pedido.
   * **Objeción de precio o consulta compleja:** Escalamiento inmediato a Chatwoot.

---

## 6. 🤖 Ecosistema de Agentes REGE y Subagentes Especializados

### Orquestador Principal
* **Antigravity:** Agentic AI coding assistant y orquestador maestro del proyecto.

### Agentes Ejecutores REGE
* **OpenCode:** Ejecución de código headless en el VPS.
* **OpenHands:** Agente programador autónomo.
* **OpenClaw:** Gateway de entrada de instrucciones vía Telegram.
* **Dify.AI:** Motor de orquestación conversacional.

### Matriz de Subagentes Especializados (`.agents/agents/`)

| Agente | Rol y Responsabilidad |
|---|---|
| **ValentinaRios** | Asistente principal de ventas, catálogo y precios para WhatsApp JGIS. |
| **MetaAdsCopywriter** | Redactor creativo de anuncios para Meta Ads (estructuras PAS/BAB). |
| **RAGSoporte** | Respuestas sobre políticas de envío, métodos de pago y preguntas frecuentes. |
| **CatalogSpecialist** | Gestión e ingeniería de datos del inventario en la base de datos PostgreSQL. |
| **MetaAdsIntegrator** | Integración con Meta Ads API y Conversions API (CAPI). |
| **QATester** | Pruebas automatizadas de flujos conversacionales, botones y webhooks E2E. |
| **SeniorDevReviewer** | Auditoría de código, seguridad, arquitectura y desempeño. |

---

## 7. 🚀 Protocolo de Despliegue CI/CD y Verificación Dual

### Pipeline de Despliegue Automático
1. `git push main` ➔ GitHub envía webhook a `https://bot.jgispublicidad.pe/deploy-webhook`.
2. `webhook-listener.js` valida la firma HMAC-SHA256.
3. `deploy.sh` en la VM realiza `git pull` + `docker compose up -d --build webhook`.
4. Healthcheck automático con rollback si falla la compilación.

### Requisito Nginx de Rate Limiting
En Nginx del VPS, la directiva `location /` debe incluir cabeceras de proxy para `express-rate-limit`:
```nginx
location / {
    proxy_pass http://localhost:3005;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

### Bucle de Verificación Dual Post-Deploy (Obligatorio)
Tras cada despliegue en el VPS, es **estrictamente obligatorio** ejecutar la prueba dual:
```bash
node scripts/test_whatsapp_and_messenger.js
```
La prueba debe validar **2 mensajes entrantes en WhatsApp** y **2 mensajes entrantes en Messenger** obteniendo `EXIT CODE 0`.

---

## 8. 📐 Reglas Técnicas de Typebot v6

1. **`outgoingEdgeId` Obligatorio:** En Typebot v6 Zod Schema, el motor `typebot-viewer` requiere **estrictamente** la propiedad `outgoingEdgeId` en el evento de inicio (`events[0]`) y en cada `item` de los menús interactivos (`choice input`). De lo contrario, `startChat` devuelve `messages: []` vacíos.
2. **Prohibición de Subcadenas Ambiguas en `agentKeywords`:** Usar frases explícitas (`'hablar con asesor'`, `'atención humana'`) y evitar palabras sueltas como `'persona'`, `'asesor'` o `'agente'` que colisionan con respuestas como `"🙋‍♂️ Uso Personal"`.
3. **Cero `process.exit()` en Scripts de Testeo Internos:** Evitar `process.exit(0)` en scripts ejecutados dentro del contenedor Express para no reiniciar el servicio PID 1 en vivo.
4. **Simulación Turno por Turno:** Simular interacciones de cliente con pausas de 10 segundos entre turnos para correcta renderización y registro en Chatwoot.

---

## 9. 🏷️ Control de Versiones y Tagging de Producción

* **Versionado Semántico Estricto (`vX.Y.Z`):** Cada hito estable se sella con un tag oficial en Git (ej. `v1.0.0`, `v1.1.0`).
* **Tagging Automático:** Tras pasar la verificación dual multicanal y la prueba visual en Chatwoot:
  ```bash
  git tag -a vX.Y.Z -m "Descripción del hito verificado"
  git push origin vX.Y.Z
  ```
* **Rollback Checkpoints:** Todo cambio futuro se construye sobre commits/tags estables que permiten rollback en menos de 60 segundos.

---

## 10. 📔 Registro de Problemas Reiterativos y Soluciones Aplicadas

### Registro #1: Discrepancia de Código por Falta de Volúmenes en Docker
* **Causa:** `docker-compose.yml` carecía de `volumes: - ./src:/app/src`.
* **Solución:** Se añadieron montajes de volúmenes en vivo en `docker-compose.yml` y la bandera `--build` en `deploy.sh`.

### Registro #2: Rechazo de Mensajes desde Chatwoot CRM (Error Meta #100 `HUMAN_AGENT`)
* **Causa:** Chatwoot enviaba mensajes con `messaging_type: "MESSAGE_TAG"` y etiqueta `"HUMAN_AGENT"` sin aprobación previa de Meta.
* **Solución:** Creación del servicio `metaGraphService.js` que envía los mensajes con `messaging_type: "RESPONSE"`, exenta de aprobación previa.

### Registro #3: Nombre Genérico "John Doe" en Contactos de Messenger
* **Causa:** Meta Graph API no devolvía el nombre automáticamente al recibir PSID de Messenger.
* **Solución:** `metaGraphService.resolveAndUpdateChatwootContact()` consulta automáticamente `GET /v19.0/${PSID}?fields=first_name,last_name` y actualiza la ficha real del usuario en Chatwoot.

### Registro #4: Colisiones de Nginx con la API de Auth de Typebot (`/api/auth`)
* **Causa:** La regla Nginx `/api` enviaba peticiones de autenticación al contenedor Webhook (`3005`) en lugar de `typebot-builder` (`8081`).
* **Solución:** Se crearon bloques con precedencia alta en Nginx: `/api/search` y `/api/handover` hacia el puerto `3005`, y `/api` hacia el puerto `8081`.

---
*Documento maestro consolidado para JGIS Publicidad. Última actualización sincronizada en Git main.*
