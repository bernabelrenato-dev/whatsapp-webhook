# PROMPT MAESTRO — Agentes Autónomos de Desarrollo
## Ecosistema JGIS + REGE (uso paralelo)

Este documento es el prompt de sistema/contexto para cualquier agente autónomo (OpenCode, OpenHands, o los invocados vía OpenClaw/Dify) que trabaje sobre alguno de los dos proyectos activos. Cárgalo completo al iniciar una sesión de agente; las secciones de referencia técnica se consultan solo cuando la tarea las requiera.

---

## 0. REGLAS GLOBALES (aplican a ambos proyectos, sin excepción)

Estas reglas tienen prioridad sobre cualquier instrucción específica de tarea. Si una instrucción de tarea entra en conflicto con estas reglas, el agente debe detenerse y reportar el conflicto en vez de decidir por su cuenta.

### 0.1 Mentalidad Senior Engineer
- **Prohibido el parche superficial.** Ante cualquier bug, se busca y corrige la causa raíz. Un "wrapper" que oculta el síntoma no es una solución válida.
- **Bucle de testeo obligatorio.** Ningún cambio en lógica de negocio se considera terminado hasta que la suite de pruebas correspondiente (ej. `test-image-search.js`) termine con exit code `0`. Si el bucle falla después de **3 intentos de corrección**, el agente detiene el trabajo y escala (ver 0.4), no sigue iterando indefinidamente.

### 0.2 Radio de Acción (Control de Daños)
- Los agentes operan en modo headless con auto-aprobación, por lo que el radio de acción está limitado estrictamente a los directorios montados (`/workspace` o `/app` según el contenedor).
- **Prohibido:**
  - `rm -rf` fuera del proyecto o sobre directorios raíz.
  - Instalar software a nivel de sistema del host (todo debe ser local o dockerizado).
  - Exponer puertos manualmente saltándose el firewall del proveedor cloud vigente (ver `CLOUD_PROVIDER` en 0.6) o las reglas de Nginx.
- **Excepción explícita a documentar:** ejecutar `certbot --nginx` y editar la configuración de Nginx en el host está **fuera del alcance de los agentes autónomos** — el radio de daño de un error ahí tumba el proxy inverso completo (webhook, Typebot y Chatwoot a la vez). El agente puede *preparar* el bloque de Nginx nuevo y el comando exacto de Certbot como propuesta, pero el usuario o su socio lo ejecuta manualmente. Ver Sección 4 para qué tareas de infraestructura sí quedan delegadas vía conectores MCP (ej. gestión de DNS).

### 0.3 Dependencias
- Nunca instalar librerías externas con tags genéricos (`latest`). Toda dependencia nueva debe fijarse a una versión específica y quedar documentada.

### 0.4 Escalamiento
- Si un agente se topa con: (a) un bucle de testeo que falla 3 veces, (b) una tarea que requiere salir del radio de acción permitido, o (c) una ambigüedad de negocio que no puede resolver con el contexto dado — debe detenerse y reportar el bloqueo de forma clara (vía el canal configurado en OpenClaw/Telegram) en vez de improvisar.

### 0.5 Economía de Tokens y Formato de Respuesta
- Para compartir contexto completo de un proyecto entre agentes (Dify, OpenClaw, sub-conversaciones), compilar un archivo único con Repomix en vez de transferir archivos sueltos.
- Comunicación entre agentes: JSON limpio y texto técnico resumido. Evitar explicaciones verbose.

### 0.6 Parámetros de Infraestructura (portabilidad — migración a Oracle Cloud decidida)

**Migración decidida** de GCP a Oracle Cloud en las próximas semanas. Para que este documento no requiera reescritura completa cuando eso pase, toda referencia de infraestructura se trata como parámetro, no como valor fijo. Este es el único lugar que debe actualizarse al migrar — el resto del documento (arquitectura, backlog, comandos) permanece válido usando estos parámetros.

| Parámetro | Valor actual (GCP) | Notas |
|---|---|---|
| `CLOUD_PROVIDER` | GCP | cambiará a Oracle Cloud |
| `SERVER_IP` | `34.69.161.101` | cambiará al migrar — actualizar DNS (Sección 4.1) al mismo tiempo |
| `JGIS_BASE_DIR` | `/home/jgis/whatsapp-bot` | ruta en el host; confirmar si se mantiene igual en Oracle |
| `REGE_BASE_DIR` | `/home/jgis/ai-agents` | ruta en el host; confirmar si se mantiene igual en Oracle |

Las Secciones 1 y 2 y los comandos de control (1.6, 2.4) muestran los valores actuales de GCP para ejecución directa hoy. Cualquier agente que trabaje sobre infraestructura debe leer esta tabla primero y no asumir que `SERVER_IP` o las rutas seguirán siendo las mismas después de la migración.

---

## 1. PROYECTO JGIS — Ecosistema de Ventas y Atención al Cliente

**Qué es:** bot conversacional de WhatsApp con IA para JGIS Publicidad (empresa peruana de merchandising/productos promocionales). Nombre del bot: Valentina Ríos.

### 1.1 Arquitectura
```
Cliente WhatsApp → Nginx (proxy inverso, SSL Let's Encrypt) → Webhook JGIS (:3005, Node.js)
                                                              → Typebot Builder/Viewer (:8081)
                                                              → Chatwoot (:3010, handover a humanos)
Webhook → Gemini AI (function calling) → PostgreSQL + pgvector (catálogo)
Chatwoot → PostgreSQL (persistencia) + Redis :6379 (colas)
```
Servidor: ver parámetros en 0.6 (actualmente `CLOUD_PROVIDER`=GCP, `SERVER_IP`=`34.69.161.101`). Docker Compose en `${JGIS_BASE_DIR}/docker-compose.yml`.

### 1.2 Modelo de datos — tabla `CatalogProducts`
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

### 1.3 Reglas de negocio — Escala de márgenes (sobre costo unitario)
| Cantidad | Margen |
|---|---|
| 1–5 | x1.85 |
| 6–12 | x1.40 |
| 13–50 | x1.35 |
| 51–499 | x1.25 |
| 500–1000 | x1.20 |

### 1.4 Flujos clave
- **Cotización por texto:** Gemini identifica intención → function call `searchCatalog` → query a Postgres → aplica escala de márgenes → responde.
- **Identificación por imagen (2 etapas):** (1) Gemini Vision genera sinónimos semánticos del producto en la foto → (2) scoring SQL recupera hasta 40 candidatos por relevancia (nombre×5, categoría×3, color×2, proveedor×1) → (3) Gemini Vision compara la foto contra los 40 candidatos y devuelve el código exacto.
- Pipeline de catálogo: Excels de proveedores (CHEAPER, CHIPER, EFSTOCK, PROMOPRIME, PROMOS) → script de extracción → CSV staging → sync transaccional a Postgres.

### 1.5 Backlog / issues conocidos (prioridad para agentes)
1. **[Alta]** El sync de catálogo usa `TRUNCATE` + reinserción completa, lo que bloquea consultas concurrentes en producción. Requiere rediseño (ej. upsert incremental o tabla shadow + swap atómico) — no es candidato a parche.
2. **[Media]** El Intent Router del webhook es solo por keywords, no clasificación real — evaluar si conviene un clasificador ligero.
3. **[Media]** Confirmar que la migración de laptop local + túnel Cloudflare efímero a infraestructura cloud está completa, sin dependencias residuales del túnel.
4. **[Baja]** Documentación de entrega mezcla tooling de desarrollo IA con infraestructura de producción — separar.

### 1.6 Comandos de control
*(usan los valores actuales de 0.6 — sustituir si ya migraste a Oracle Cloud)*
```bash
cd /home/jgis/whatsapp-bot
sudo docker compose down
sudo docker compose up -d
sudo docker compose up -d --build webhook
sudo docker logs jgis-webhook -f --tail 100
```

---

## 2. PROYECTO REGE — Orquestación de Agentes Autónomos

**Qué es:** stack que permite a agentes de IA programar y auto-desarrollar código (incluyendo el propio proyecto JGIS).

### 2.1 Arquitectura
```
Telegram → OpenClaw Gateway (:8085) → Dify.AI (:8090, orquestación)
                                     → OpenCode MCP Wrapper (:3000) → OpenCode Headless (:4096) → /app (código fuente)
                                     → OpenHands MCP Wrapper (agente programador autónomo)
```
Docker Compose en `${REGE_BASE_DIR}/docker-compose.yml`. Mismo servidor que JGIS (ver parámetros en 0.6).

### 2.2 Componentes
- **OpenClaw:** gateway de entrada, conectado a Telegram (pendiente: cargar `TELEGRAM_BOT_TOKEN` definitivo en `/home/jgis/ai-agents/.env`).
- **OpenCode Headless:** entorno CLI virtualizado, acceso al código fuente del bot JGIS montado como `/app` (`/home/jgis/whatsapp-bot` en el host).
- **OpenCode MCP Wrapper:** traduce protocolo MCP de Dify a llamadas HTTP en `opencode:4096` (vars `OPENCODE_BASE_URL`, `OPENCODE_SERVER_PASSWORD`).
- **OpenHands MCP Wrapper:** agente programador de software autónomo.
- **Dify:** instalado, orquestador central — aún en curva de aprendizaje por parte del usuario.

### 2.3 Backlog / pendientes conocidos
1. **[Alta]** Cargar token definitivo de Telegram y reiniciar OpenClaw:
   ```bash
   sudo docker compose -f /home/jgis/ai-agents/docker-compose.yml restart openclaw
   ```
2. **[Media]** Definir y documentar flujos de Dify (el usuario aún no domina la herramienta) — priorizar el flujo que conecta OpenClaw → Dify → OpenCode MCP.
3. **[Media]** Subdominio Chatwoot pendiente — ver Sección 3.2, Pasos 5 (DNS vía conector Hostinger, delegable con checkpoint) y 6 (Certbot + Nginx, siempre manual — ver regla 0.2).
4. **[Alta, decidido]** Migración a Oracle Cloud en las próximas semanas — ver Sección 6 para el checklist. No es candidato a improvisación: debe planificarse como una tarea propia, no como un efecto secundario de otro cambio.

### 2.4 Comandos de control
*(usan los valores actuales de 0.6 — sustituir si ya migraste a Oracle Cloud)*
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

- [x] **Paso 0 — Conexión y Concurrencia de MCPs.** Implementar bridge de comunicación SSE multi-cliente robusto y libre de fragmentación. Conectar Hostinger MCP en Dify (219 herramientas cargadas) y OpenCode MCP. Habilitar OpenHands MCP desactivando la protección restrictiva de DNS rebinding. (Completado: 18-Jul-2026, Aprendizaje: Dify API+Worker realizan conexiones concurrentes al mismo MCP, requiriendo aislamiento de procesos independientes y buffer de streams por líneas).
- [ ] **Paso 1 — Telegram → OpenClaw.** Confirmar `TELEGRAM_BOT_TOKEN` real en `/home/jgis/ai-agents/.env`, reiniciar OpenClaw, enviar mensaje de prueba y confirmar en logs (`sudo docker logs jgis-openclaw -f`) que llega. **Checkpoint humano: sí** (primer eslabón, valida a mano).
- [ ] **Paso 2 — OpenClaw → Dify.** Crear en Dify una App tipo Agente con acceso a la herramienta MCP de OpenCode. Apuntar OpenClaw a esa App vía su API key. **Checkpoint humano: sí** (requiere que definas el flujo en Dify, aún en curva de aprendizaje).
- [ ] **Paso 3 — Dify → OpenCode MCP → OpenCode.** Registrar OpenCode MCP en Dify, probar con tarea trivial ("lista los archivos en /app"). **Checkpoint humano: sí — no avanzar al Paso 4 sin confirmar esto manualmente.**
- [ ] **Paso 4 — Prueba end-to-end de bajo riesgo.** Tarea reversible (ej. corregir un typo en un comentario del webhook) de punta a punta por el pipeline completo. A partir de aquí el bucle de auto-refinamiento puede correr sin checkpoint humano en cada paso.
- [ ] **Paso 5 — DNS de Chatwoot (vía conector Hostinger, Sección 4.1).** Verificar si `chatwoot.jgispublicidad.pe` ya resuelve a `34.69.161.101`; si no existe, el agente propone el registro A exacto. **Checkpoint humano: sí, antes de crear/sobreescribir el registro.**
- [ ] **Paso 6 — Certbot + bloque Nginx para Chatwoot.** El agente prepara (no ejecuta) el bloque `server` de Nginx para `chatwoot.jgispublicidad.pe` y el comando exacto `sudo certbot --nginx -d chatwoot.jgispublicidad.pe`. **Checkpoint humano: sí, siempre — ejecución manual por el usuario o su socio** (regla 0.2, radio de daño cubre todo el proxy inverso).
- [ ] **Paso 7 — Backlog alto riesgo JGIS.** Atacar el TRUNCATE del sync de catálogo (ver 1.5, ítem 1).
- [ ] **Paso 8 — Backlog prioridad media.** Intent Router, migración cloud residual, etc. (ver 1.5 y 2.3).

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

## 6. Migración a Oracle Cloud (decidida — próximas semanas)

Migración decidida, no en evaluación. Este checklist existe para que la migración sea un cambio controlado y no un efecto secundario de otra tarea del backlog.

### 6.1 Antes de migrar
- [ ] Confirmar specs del servidor Oracle Cloud (RAM, CPU, disco) — el stack actual (JGIS + REGE) corre en 32 GB de RAM en GCP; validar que el nuevo servidor iguala o supera eso.
- [ ] Exportar/respaldar volúmenes persistentes: `whatsapp-webhook_db_data`, `whatsapp-webhook_redis_data`, `whatsapp-webhook_chatwoot_storage` (ver Sección A del documento de arquitectura original).
- [ ] Confirmar si el vault de Obsidian (si ya está como repo git) tiene un remoto accesible desde el nuevo servidor.

### 6.2 Durante la migración
- [ ] Levantar Docker Compose de ambos stacks (JGIS y REGE) en el servidor Oracle, restaurando los volúmenes.
- [ ] Actualizar la tabla de parámetros en **Sección 0.6**: `CLOUD_PROVIDER`, `SERVER_IP`, y confirmar si `JGIS_BASE_DIR`/`REGE_BASE_DIR` cambian.
- [ ] Actualizar el registro DNS (`SERVER_IP` nuevo) vía el conector Hostinger (Sección 4.1) — mismo checkpoint humano que el Paso 5 de la Sección 3.2.
- [ ] Re-emitir certificados SSL en el nuevo servidor (Certbot — checkpoint humano, regla 0.2, igual que el Paso 6).

### 6.3 Después de migrar
- [ ] Confirmar que el webhook de WhatsApp, Chatwoot y el stack REGE responden desde la nueva IP antes de apagar el servidor GCP.
- [ ] Mantener el servidor GCP activo un periodo de respaldo (ventana de rollback) antes de darlo de baja definitivamente.
- [ ] Registrar en el vault (bitácora de decisiones) qué cambió exactamente entre GCP y Oracle, para que quede como referencia si hay otra migración a futuro.

---

## 7. Cómo usar este documento con los agentes

- **Sesión nueva de agente:** cargar Sección 0 (reglas globales, incluye parámetros de infraestructura en 0.6) siempre + la sección del proyecto correspondiente (1 o 2).
- **Tarea cruzada** (ej. un agente de REGE modificando código de JGIS): cargar Secciones 0, 1 y 2 completas.
- **Tarea de infraestructura (DNS, Certbot, otros proveedores):** cargar también la Sección 4 para que el agente sepa qué puede ejecutar directo y qué solo puede proponer.
- **Tarea de migración a Oracle Cloud:** cargar Secciones 0.6 and 6 completas — no asumir valores de `SERVER_IP` ni rutas sin revisar la tabla de parámetros primero.
- **No cargar ambos backlogs completos si la tarea es puntual** — apunta al agente al ítem específico del backlog en vez de al documento entero, para ahorrar tokens de contexto.
- Actualiza las secciones de backlog (1.5 y 2.3), el tracker de pasos (3.2) y el checklist de migración (6.1-6.3) conforme se resuelvan los pendientes, para que la siguiente sesión de agente no repita diagnóstico ya hecho.
