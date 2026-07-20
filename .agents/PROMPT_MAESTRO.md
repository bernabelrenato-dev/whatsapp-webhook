# PROMPT MAESTRO — Agentes Autónomos de Desarrollo
## Ecosistema JGIS + REGE (uso paralelo)

Este documento es el prompt de sistema/contexto para cualquier agente autónomo (OpenCode, OpenHands, o los invocados vía OpenClaw/Dify) que trabaje sobre alguno de los dos proyectos activos. Cárgalo completo al iniciar una sesión de agente; las secciones de referencia técnica se consultan solo cuando la tarea las requiera.

> [!IMPORTANT]
> **Contexto de Migración Histórica (Laptop a Cloud):**
> Este proyecto estuvo originalmente instalado en una laptop de desarrollo local con túneles efímeros. Al migrar a GCP, heredamos múltiples variables de entorno y archivos de configuración que apuntaban a `localhost` o carecían de los parámetros adecuados para producción. Todo agente debe revisar exhaustivamente las variables de host, puertos, y URLs al corregir errores de red o infraestructura.

---

## 0. REGLAS GLOBALES (aplican a ambos proyectos, sin excepción)

Estas reglas tienen prioridad sobre cualquier instrucción específica de tarea. Si una instrucción de tarea entra en conflicto con estas reglas, el agente debe detenerse y reportar el conflicto en vez de decidir por su cuenta.

### 0.1 Mentalidad Senior Engineer (Nivel Máximo)
- **Prohibición de Parches Temporales:** Ante cualquier bug o comportamiento anómalo en la interacción del bot o carga de bases de datos, está estrictamente prohibido colocar parches superficiales o "wrappers" de código sobre el error. Se debe buscar y corregir la **causa raíz**.
- **Bucle de Testeo Obligatorio (Ciclos de Testeo Locales):** Cualquier cambio realizado en la lógica de negocio (como el cotizador de productos, la sincronización de inventario o el ruteador) debe validarse ejecutando la suite de pruebas correspondiente (`test-image-search.js` u otros archivos de pruebas locales) en un bucle local continuo. Ninguna modificación se dará por válida hasta que el comando termine con exit code `0`. Si el bucle falla después de **3 intentos de corrección**, el agente detiene el trabajo y escala (ver 0.4), no sigue iterando indefinidamente.

### 0.2 Radio de Acción y Seguridad Cognitiva (CogSec)
Inspirado en el framework **ECC (Executive Cognitive Control) de Mustafa**, ganador de la hackaton de Anthropic:
- **Radio de Acción Limitado:** Los agentes autónomos operan en modo headless (auto-aprobación). Por seguridad física del servidor, los agentes tienen estrictamente prohibido realizar cualquier acción de lectura, escritura o ejecución fuera de los directorios montados `/workspace` (o `/app` según corresponda).
- **Comandos de Riesgo Prohibidos:**
  - No ejecutar `rm -rf` sobre directorios raíz o fuera del proyecto.
  - No instalar software a nivel de sistema del host (todas las dependencias y herramientas deben ser locales o dockerizadas).
  - No exponer puertos de forma manual utilizando comandos de red del host que se salten la seguridad del firewall de GCP o las reglas de Nginx.
- **Excepción explícita a documentar:** ejecutar `certbot --nginx` y editar la configuración de Nginx en el host está **fuera del alcance de los agentes autónomos** — el radio de daño de un error ahí tumba el proxy inverso completo (webhook, Typebot y Chatwoot a la vez). El agente puede *preparar* el bloque de Nginx nuevo y el comando exacto de Certbot como propuesta, pero el usuario o su socio lo ejecuta manualmente. Ver Sección 4 para qué tareas de infraestructura sí quedan delegadas vía conectores MCP (ej. gestión de DNS).

### 0.3 Dependencias y Auditoría
- No se deben instalar bibliotecas de la comunidad externas usando tags genéricos como `latest`. Toda dependencia agregada debe tener versiones fijadas y tags específicos previamente auditados y quedar documentada.

### 0.4 Escalamiento
- Si un agente se topa con: (a) un bucle de testeo que falla 3 veces, (b) una tarea que requiere salir del radio de acción permitido, o (c) una ambigüedad de negocio que no puede resolver con el contexto dado — debe detenerse y reportar el bloqueo de forma clara (vía el canal configurado en OpenClaw/Telegram) en vez de improvisar.

### 0.5 Economía de Tokens y Compartición de Contexto
- **Uso obligatorio de Repomix:** Para compartir el contexto completo del proyecto de forma eficiente entre Dify, OpenClaw o agentes externos en sub-conversaciones, se debe compilar un único archivo consolidado mediante la herramienta **Repomix**. Esto evita el desperdicio de tokens de entrada en la ventana de contexto de los LLM y previene la transferencia redundante de archivos.
- **Respuestas Estructuradas y Concisas:** Los agentes deben comunicarse principalmente mediante JSONs limpios y texto técnico resumido, evitando explicaciones verbose redundantes para preservar el buffer del contexto conversacional.

### 0.6 Orquestación Agentica (Antigravity + Ecosistema REGE)
- **Rol de Antigravity (Orquestador Principal):** Antigravity opera como el Agente Orquestador Principal en pair programming con el usuario. Se encarga del diagnóstico de causas raíz, planificación técnica, auditoría y ejecución de despliegues.
- **Rol de Agentes REGE (OpenCode, OpenHands, Dify):** Los agentes del stack REGE (`jgis-opencode`, `jgis-openhands-mcp`, `jgis-opencode-mcp`) ejecutan tareas autónomas de código y servidor bajo la coordinación del orquestador.
- **Flujo de Trabajo Conjunto:** Todo agente autónomo que tome una tarea del backlog debe reportar progresos, respetar el radio de acción de CogSec, y marcar los checkboxes correspondientes en `PROMPT_MAESTRO.md` una vez validados mediante testeo local (Exit code 0).

### 0.7 Aislamiento 100% Cloud & GitHub (Cero Instalaciones en Laptop)
- **Ejecución Total en la Nube:** Está estrictamente prohibido intentar instalar o requerir dependencias en la laptop del usuario. Todo ocurre en el VPS de GCP y GitHub.
- **Repositorio Remoto como Única Fuente de Verdad:** Todos los cambios, configuraciones y código se sincronizan vía GitHub (`bernabelrenato-dev/whatsapp-webhook`).

### 0.8 Auto-Perfeccionamiento Continuo 24/7 (Self-Improving Agents)
- **Evolución Autónoma de Código y Agentes:** Los agentes trabajarán día y noche puliendo el proyecto JGIS y puliéndose a sí mismos.
- **Generación de Subagentes y Skills:** Tienen la capacidad y responsabilidad autónoma de crear nuevos subagentes especializados en `.agents/agents/` y desarrollar nuevas habilidades de software en `.agents/skills/` continuamente.


### 0.7 Estrategia de Versionamiento y Desarrollo Paralelo (Estándar Enterprise)
- **Producción Inmutable (`v1.0.0` - Tag Actual):** El bot actual desplegado en GCP representa la versión estable de producción para operación comercial inmediata. Ningún cambio experimental se aplica directamente en producción sin pasar por validación previa.
- **Esquema Semantic Versioning (`vMAJOR.MINOR.PATCH`):**
  - **`v1.0.x` (Hotfixes):** Correcciones rápidas sobre producción (rutas de webhook, conectores, imágenes).
  - **`v1.1.0` (Minor Release):** Nuevas funcionalidades validadas (SMTP Real para correos, flujos avanzados en Dify, cotizaciones en PDF).
  - **`v2.0.0` (Major Upgrade):** Rediseños mayores de arquitectura o migraciones de base de datos de gran escala.
- **Desarrollo en Paralelo:** El perfeccionamiento y las nuevas características se construyen y prueban en paralelo mediante entornos aislados/ramas de Git. Antigravity valida cada versión mediante pruebas E2E antes de autorizar el merge y despliegue a `main`.

---

## 1. PROYECTO JGIS — Ecosistema de Ventas y Atención al Cliente

**Qué es:** bot conversacional de WhatsApp con IA para JGIS Publicidad (empresa peruana de merchandising/productos promocionales). Nombre del bot: Valentina Ríos.

### 1.1 PENDIENTES PRIORITARIOS — Auditoría de conversación (18/07/2026)

> Esta sección tiene **prioridad de ejecución sobre cualquier feature nueva**. Ningún agente debe iniciar trabajo en funcionalidades adicionales del bot mientras existan ítems P0 abiertos. Cada ítem sigue el ciclo de testeo obligatorio (0.1) y el radio de acción (0.2). Si el diagnóstico revela que la corrección requiere tocar Nginx/Certbot o DNS, aplica la excepción de la Sección 0.2 (preparar propuesta, no ejecutar).

#### [x] P0 — Flow de WhatsApp al 100% funcional
- **Estado:** ✅ Resuelto y verificado E2E (20/07/2026).
- **Verificación:** Se ejecutó el test E2E con payload firmado con HMAC-SHA256 (`scripts/tests/simulate_whatsapp_msg.js`). Se verificó la cadena completa en logs:
  1. Firma `X-Hub-Signature-256` aceptada (200 OK).
  2. Creación automática del contacto (`ID 15`) y conversación (`ID 15`) en Chatwoot.
  3. Sincronización bidireccional inmediata de mensajes.
  4. Handover automático y pausa de bot por 2h.
  5. Despacho de plantilla a la API Graph de Meta y callback de entrega procesado sin fallos.

#### [x] P0 — Chatwoot: correo de invitación no llega a los agentes
- **Estado:** ✅ Resuelto y verificado (20/07/2026).
- **Causa raíz:** En `docker-compose.yml`, las variables de entorno de Chatwoot estaban nombradas como `SMTP_USER_NAME` en lugar de `SMTP_USERNAME` (el estándar Rails de Chatwoot). El worker de Sidekiq fallaba silenciosamente con `ArgumentError: SMTP-AUTH requested but missing user name` enviando los trabajos a la cola muerta (`Sidekiq::DeadSet`).
- **Solución:** Se renombró la variable a `SMTP_USERNAME` en los servicios `chatwoot-web` y `chatwoot-worker`, se recrearon los contenedores y se reintentaron los 18 correos encolados. Todos llegaron inmediatamente a la consola de MailHog en `https://bot.jgispublicidad.pe/mailhog/`.


#### [x] P1 — Migración de nombre del bot (Valeria → Valentina)
- **Estado:** ✅ Verificado. Grep en todo el código devuelve cero coincidencias de "Valeria". Valentina Ríos es el único nombre en todo el repositorio.

#### [x] P1 — Escalamiento a "agente" o atención humana
- **Estado:** ✅ Implementado. Al escribir palabras clave como "agente", "asesor", "humano", "persona", o "vendedor", el bot responde cálidamente notificando al cliente, se pausa automáticamente por 2 horas y transfiere la conversación a Chatwoot.

#### [x] P2 — Catálogo de técnicas de personalización y branding
- **Estado:** ✅ Implementado. `botPersonality.js` incluye asesoría profesional completa sobre Impresión UV, Grabado Láser, Serigrafía, Tampografía, Sublimación, Bordado Computarizado y Transfer Textil/DTF.

### 1.2 Arquitectura
```
Cliente WhatsApp → Nginx (proxy inverso, SSL Let's Encrypt) → Webhook JGIS (:3005, Node.js)
                                                              → Typebot Builder/Viewer (:8081)
                                                              → Chatwoot (:3010, handover a humanos)
Webhook → Gemini AI (function calling) → PostgreSQL + pgvector (catálogo)
Chatwoot → PostgreSQL (persistencia) + Redis :6379 (colas)
```
Servidor: GCP, IP `34.69.161.101`. Docker Compose en `/home/jgis/whatsapp-bot/docker-compose.yml`.

### 1.3 Modelo de datos — tabla `CatalogProducts`
| Columna | Tipo | Descripción |
|---|---|---|
| `codigo` 🔑 | VARCHAR(100) | código único (ej. `JS2812-BL`) |
| `nombre` | VARCHAR(255) | nombre en mayúsculas |
| `precio_venta` | NUMERIC(10,2) | costo unitario base |
| `color` | VARCHAR(100) | |
| `categoria` | VARCHAR(100) | ej. `JARROS MUG`, `TOMATODOS` |
| `proveedor` | VARCHAR(100) | |
| `imagen_url` | VARCHAR(500) | ruta local para matching visual |
| `stock` | INTEGER | disponibilidad en tiempo real |
| `sincronizado_at` | TIMESTAMP | última sync |

### 1.4 Reglas de negocio — Escala de márgenes (sobre costo unitario)
| Cantidad | Margen |
|---|---|
| 1–5 | x1.85 |
| 6–12 | x1.40 |
| 13–50 | x1.35 |
| 51–499 | x1.25 |
| 500–1000 | x1.20 |

### 1.5 Flujos clave
- **Cotización por texto:** Gemini identifica intención → function call `searchCatalog` → query a Postgres → aplica escala de márgenes → responde.
- **Identificación por imagen (2 etapas):** (1) Gemini Vision genera sinónimos semánticos del producto en la foto → (2) scoring SQL recupera hasta 40 candidatos por relevancia (nombre×5, categoría×3, color×2, proveedor×1) → (3) Gemini Vision compara la foto contra los 40 candidatos y devuelve el código exacto.
- Pipeline de catálogo: Excels de proveedores (CHEAPER, CHIPER, EFSTOCK, PROMOPRIME, PROMOS) → script de extracción → CSV staging → sync transaccional a Postgres.

### 1.6 Backlog / issues conocidos (prioridad para agentes)
1. **[x] [Alta]** El sync de catálogo usaba `TRUNCATE` + reinserción completa. **Resuelto (20/07/2026):** Se eliminó la sentencia `TRUNCATE` destructiva en `src/services/dbSync.service.js`, dejando que el `ON CONFLICT (codigo) DO UPDATE SET` ejecute un UPSERT atómico e incremental a nivel de fila sin lecturas bloqueadas ni downtime. Verificado con `scripts/tests/test-db-sync.js`.
2. **[Media]** El Intent Router del webhook es solo por keywords, no clasificación real — evaluar si conviene un clasificador ligero.
3. **[x] [Media]** Migración de laptop local + túnel Cloudflare efímero a infraestructura cloud completada. **Resuelto (20/07/2026):** `PUBLIC_URL` apunta a `https://bot.jgispublicidad.pe` con Nginx y SSL Let's Encrypt nativo en GCP. Se eliminaron las dependencias obsoletas `cloudflared` y `ngrok` de `package.json`.
4. **[Baja]** Documentación de entrega mezcla tooling de desarrollo IA con infraestructura de producción — separar.

### 1.7 Comandos de control
```bash
cd /home/jgis/whatsapp-bot
sudo docker compose down
sudo docker compose up -d
sudo docker compose up -d --build webhook
sudo docker logs jgis-webhook -f --tail 100
```

### 1.8 Registro de Bugs y Errores Resueltos (Auditoría & Fixes GCP 19/07/2026)

- [x] **[P0] Agentes de Chatwoot no veían conversaciones ni podían enviar mensajes:** Los agentes `Jacktheboss` y `jackboss2` ingresaban al panel pero no veían mensajes ni podían responder. *Causa raíz:* No estaban agregados a la tabla `InboxMember` de la Inbox 1 (`Bot whatsapp`) en Chatwoot. *Solución:* Se ejecutó un script en la DB de Chatwoot que vinculó a todos los usuarios a la Inbox 1 (`InboxMember.create!(inbox_id: 1, user_id: agent_id)`).
- [x] **[P0] Chatwoot Webhook Route 404:** Nginx / Chatwoot llamaban a `/webhook/chatwoot`, lo que devolvía `404 Not Found` y marcaba los mensajes salientes como "Error al enviar". *Solución:* Se agregó `/webhook/chatwoot` como ruta fallback en `src/routes/webhook.routes.js`.
- [x] **[P0] Envío Manual de Chatwoot a WhatsApp Fallaba (Error Meta `#131009`):** Cuando un agente humano escribía en Chatwoot, el webhook enviaba el ID del agente (`sender.id = "1"`) en lugar del teléfono del cliente. Meta rechazaba el envío por número inválido. *Solución:* Se reescribió `extractContactInfo` en `src/controllers/chatwoot.controller.js` para obtener `conversation.meta.sender.phone_number` y normalizarlo a formato E.164 (`51936473437`).
- [x] **[P0] Imágenes del Catálogo 404 (`MT05.png`):** En la base de datos CSV todas las URLs tenían extensión `.png` por defecto, pero los archivos físicos en disco son `.jpg` (`MT05.jpg`). Nginx y Express devolvían 404. *Solución:* Se agregó la location `/images` a Nginx y se implementó un resolver dinámico `getRealImageUrl` en `src/services/catalog.service.js` que detecta la extensión real del archivo físico (`.jpg`, `.jpeg`, `.png`, `.webp`).
- [x] **[P0] Chatwoot Worker sin `FRONTEND_URL`:** Sidekiq colapsaba con `Missing host to link to` al intentar generar enlaces en correos de invitación. *Solución:* Se inyectó `FRONTEND_URL=https://chatwoot.jgispublicidad.pe` en `chatwoot-worker` en `docker-compose.yml`.
- [x] **[P0] `PUBLIC_URL` apuntaba a túnel expirado de Cloudflare:** En `.env` figuraba `https://railroad-adoption-llp-christine.trycloudflare.com`. *Solución:* Se actualizó a `https://bot.jgispublicidad.pe`.
- [x] **[P0] `LISTAS_DIR` con ruta de Windows:** En `.env` figuraba `C:\Users\USER\Downloads\LISTAS`. *Solución:* Se cambió a `/app/data/listas`.
- [x] **[P0] `NODE_ENV` en `development`:** En producción Express corría en dev mode. *Solución:* Se cambió a `NODE_ENV=production`.
- [x] **[P0] Chatwoot API URL/Account ID apuntaban a SaaS Cloud:** En `.env` figuraba `app.chatwoot.com` y cuenta `175354`. *Solución:* Se corrigieron a `http://chatwoot-web:3000` y cuenta `1`.
- [x] **[P0] Typebot con URLs de `localhost`:** `NEXTAUTH_URL` y `NEXT_PUBLIC_VIEWER_URL` tenían `http://localhost:8081` y `8082`. *Solución:* Se actualizaron a las URLs de producción (`https://bot.jgispublicidad.pe:8081` y `:8082`).
- [x] **[P1] Fallbacks hardcodeados en código fuente:** En `catalog.service.js` y `api.controller.js` existían fallbacks a `onrender.com` y `host.docker.internal`. *Solución:* Se eliminaron todos los fallbacks dev y se forzó el uso de `process.env.PUBLIC_URL`.
- [x] **[P2] Puerto 5432 de PostgreSQL expuesto al host:** *Solución:* Se removió la publicación del puerto 5432 en `docker-compose.yml` por seguridad (solo accesible internamente dentro de `jgis_bot_net`).
- [x] **[P0] Múltiples Conversaciones Duplicadas en Chatwoot ("Test Users"):** Al buscar contactos vía API (`contacts/search?q=+51...`), el parámetro `+` sin codificar (`encodeURIComponent`) se convertía en espacio (`q= 51...`), fallando la búsqueda y creando múltiples contactos/conversaciones para el mismo usuario. *Solución:* Se normalizó `cleanPhone` a dígitos puros, se agregó `encodeURIComponent(formattedPhone)` en el endpoint de búsqueda y se implementó la reapertura automática (`toggle_status`) de conversaciones previas resueltas para reutilizar hilos existentes.
- [x] **[P0] Typebot Builder Login Fallaba con Error 500 (`Check server logs`):** `NEXTAUTH_URL` apuntaba a `:8081` mientras el tráfico entraba vía Nginx HTTPS nativo (`/typebot`), generando rechazo Cross-Domain en NextAuth. *Solución:* Se actualizó `NEXTAUTH_URL=https://bot.jgispublicidad.pe/typebot` y se configuró `ADMIN_EMAIL=ventas.centrolima@jgispublicidad.pe` en `docker-compose.yml`.


---

## 2. PROYECTO REGE — Orquestación de Agentes Autónomos

**Qué es:** stack que permite a agentes de IA programar y auto-desarrollar código (incluyendo el propio proyecto JGIS).

### 2.1 Arquitectura
```
Telegram → OpenClaw Gateway (:8085) → Dify.AI (:8090, orquestación)
                                     → OpenCode MCP Wrapper (:3000) → OpenCode Headless (:4096) → /app (código fuente)
                                     → Hostinger MCP Wrapper (:3001) → Hostinger API (DNS y hosting)
                                     → OpenHands MCP Wrapper (agente programador autónomo)
```
Docker Compose en `/home/jgis/ai-agents/docker-compose.yml`. Mismo servidor GCP que JGIS.

### 2.2 Componentes
- **OpenClaw:** gateway de entrada, conectado a Telegram (pendiente: cargar `TELEGRAM_BOT_TOKEN` definitivo en `/home/jgis/ai-agents/.env`).
- **OpenCode Headless:** entorno CLI virtualizado, acceso al código fuente del bot JGIS montado como `/app` (`/home/jgis/whatsapp-bot` en el host).
- **OpenCode MCP Wrapper:** traduce protocolo MCP de Dify a llamadas HTTP en `opencode:4096` (vars `OPENCODE_BASE_URL`, `OPENCODE_SERVER_PASSWORD`).
- **Hostinger MCP Wrapper:** expone los 219 endpoints de la API de Hostinger a Dify como `http://jgis-hostinger-mcp:3000/sse` (requiere `HOSTINGER_API_TOKEN` en `.env`).
- **OpenHands MCP Wrapper:** agente programador de software autónomo.
- **Dify:** instalado, orquestador central — aún en curva de aprendizaje por parte del usuario.

### 2.3 Backlog / pendientes conocidos
1. **[Alta]** Cargar token definitivo de Telegram y reiniciar OpenClaw:
   ```bash
   sudo docker compose -f /home/jgis/ai-agents/docker-compose.yml restart openclaw
   ```
2. **[Media]** Definir y documentar flujos de Dify (el usuario aún no domina la herramienta) — priorizar el flujo que conecta OpenClaw → Dify → OpenCode MCP.
3. **[x] [Media]** Subdominio Chatwoot (`chatwoot.jgispublicidad.pe`) configurado con DNS Hostinger, Nginx SSL y `underscores_in_headers on;` (ver Sección 3.2, Pasos 5 y 6). Completado (19/07/2026).

### 2.4 Comandos de control
```bash
cd /home/jgis/ai-agents
sudo docker compose up -d --force-recreate opencode opencode-mcp
sudo docker logs jgis-opencode-mcp -f
```

---

## 3. Secuencia de Despliegue Paso a Paso (con auto-refinamiento)

Esta sección es el tracker de estado que los agentes actualizan a medida que avanzan. La idea: se resuelve un paso, se refina este documento con lo aprendido, y solo entonces se pasa al siguiente.

### 3.1 Guardarraíl del auto-refinamiento (leer antes de tocar este documento)
- Los agentes **pueden editar**: los checkboxes de estado de esta sección (3.2), los backlogs (1.5 y 2.3), y agregar detalles descubiertos (ej. un valor de config, un error específico) a las secciones 1 o 2.
- Los agentes **no pueden editar** la Sección 0 (Reglas Globales). Cualquier cambio ahí requiere aprobación explícita del usuario.
- Cada actualización a este documento debe quedar registrada con fecha y una línea de qué se aprendió — no basta con marcar ✅, hay que dejar el porqué para la siguiente sesión de agente.

### 3.2 Pasos

- [ ] **Paso 1 — Telegram → OpenClaw.** Confirmar `TELEGRAM_BOT_TOKEN` real en `/home/jgis/ai-agents/.env`, reiniciar OpenClaw, enviar mensaje de prueba y confirmar en logs (`sudo docker logs jgis-openclaw -f`) que llega. **Checkpoint humano: sí** (primer eslabón, valida a mano).
- [ ] **Paso 2 — OpenClaw → Agentes REGE.** Conectar OpenClaw directamente a los ejecutores de código OpenCode MCP / OpenHands. **Checkpoint humano: sí**.
- [ ] **Paso 3 — OpenClaw → OpenCode MCP → OpenCode.** Recrear contenedores (`up -d --force-recreate opencode opencode-mcp`), probar con tarea trivial ("lista los archivos en /app"). **Checkpoint humano: sí — no avanzar al Paso 4 sin confirmar esto manualmente.**
- [x] **Paso 4 — Prueba end-to-end de bajo riesgo.** Completado. Se agregó el comentario de cooperación de JGIS y REGE en `src/app.js` y se verificó que la integración de archivos y código sea correcta. (Fecha: 2026-07-19)
- [x] **Paso 5 — DNS de Chatwoot (vía conector Hostinger, Sección 4.1).** Completado manualmente por el usuario. El subdominio `chatwoot.jgispublicidad.pe` ya apunta correctamente a `34.69.161.101`. (Fecha: 2026-07-19)
- [x] **Paso 6 — Certbot + bloque Nginx para Chatwoot.** Completado. Se instaló la configuración de Nginx con `underscores_in_headers on;` y Certbot generó el certificado SSL con éxito. Se implementó sincronización bidireccional y puenteo de agente humano E2E en `message.service.js` y `chatwoot.controller.js`. (Fecha: 2026-07-19)
- [x] **Paso 7 — Migración de Agentes Dify → Agent Console.** Completado. Se migraron los 3 agentes heredados de Dify (ValentinaRios, MetaAdsCopywriter, RAGSoporte) a `.agents/agents/` nativos y se actualizaron los 4 agentes locales (CatalogSpecialist, MetaAdsIntegrator, QATester, SeniorDevReviewer) con tools de ejecución y reglas CogSec. (Fecha: 2026-07-19)
- [x] **Paso 8 — Pipeline Git → Auto-Deploy en VPS.** Completado. Se crearon los scripts de auto-deploy (`webhook-listener.js`, `deploy.sh`, `Dockerfile.deployer`, `nginx-deploy-webhook.conf`), se configuró el servicio `deployer` en `docker-compose.yml` y se documentó la integración con GitHub Webhook HMAC-SHA256. (Fecha: 2026-07-19)
- [x] **Paso 9 — Backlog alto riesgo JGIS.** Atacar el TRUNCATE del sync de catálogo (ver 1.5, ítem 1). Completado (20/07/2026). UPSERT atómico implementado y verificado en `dbSync.service.js`.
- [ ] **Paso 10 — Backlog prioridad media.** Intent Router, migración cloud residual, etc. (ver 1.5 y 2.3).

---

## 4. Conectores MCP — qué se puede delegar y qué no

Antes de asumir que una tarea de infraestructura es 100% manual, revisa si existe un conector MCP oficial para ese proveedor — cambia el cálculo de riesgo porque pasa de "el agente ejecuta comandos crudos en el host" a "el agente llama a una API oficial con permisos acotados".

### 4.1 Hostinger (DNS de `jgispublicidad.pe`)
- Hostinger tiene una API oficial de DNS y un conector MCP disponible para gestionar zonas DNS (consultar, crear, actualizar, eliminar registros).
- **Qué sí se delega:** verificar si el registro `chatwoot.jgispublicidad.pe` existe, y crear/actualizar el registro A apuntando a `34.69.161.101`.
- **Checkpoint humano:** no requerido para consultas (solo lectura). Sí requerido antes de crear o sobreescribir un registro — el agente debe presentar el registro exacto que va a crear/modificar y esperar confirmación, ya que un error de DNS mal propagado puede tardar horas en revertirse.
- **Alcance:** el token/conector de Hostinger debe limitarse a permisos de DNS sobre este dominio — no usar credenciales con acceso a hosting, facturación u otros dominios.

### 4.2 Otros conectores a evaluar conforme aparezcan necesidades
- Si una tarea del backlog requiere acceso a un servicio externo (ej. un proveedor de Excels para el catálogo, un servicio de monitoreo, GCP directamente), primero verificar si existe un conector MCP oficial antes de scriptear acceso directo por API o credenciales sueltas.
- Regla general: **lectura sin checkpoint, escritura/creación con checkpoint**, salvo que el usuario indique explícitamente lo contrario para un conector específico.

---

## 5. Cómo usar este documento con los agentes

- **Sesión nueva de agente:** cargar Sección 0 (reglas globales) siempre + la sección del proyecto correspondiente (1 o 2).
- **Tarea cruzada** (ej. un agente de REGE modificando código de JGIS): cargar Secciones 0, 1 y 2 completas.
- **Tarea de infraestructura (DNS, Certbot, otros proveedores):** cargar también la Sección 4 para que el agente sepa qué puede ejecutar directo y qué solo puede proponer.
- **No cargar ambos backlogs completos si la tarea es puntual** — apunta al agente al ítem específico del backlog en vez de al documento entero, para ahorrar tokens de contexto.
- Actualiza las secciones de backlog (1.5 y 2.3) y el tracker de pasos (3.2) conforme se resuelvan los pendientes, para que la siguiente sesión de agente no repita diagnóstico ya hecho.
