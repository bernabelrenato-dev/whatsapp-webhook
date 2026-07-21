# PROMPT HIJO — PROYECTO REGE (Orquestación de Agentes Autónomos e Infraestructura)

> **Padre:** [PROMPT_MAESTRO.md](file:///c:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/.agents/PROMPT_MAESTRO.md)
> **Proyecto:** REGE (Red de Ejecutores y Agentes Autónomos)

---

## 1. Visión y Propósito de REGE

El proyecto **REGE** es la infraestructura de desarrollo y orquestación agéntica 24/7 de JGIS Publicidad. Permite a agentes de IA autónomos (OpenCode, OpenHands, Dify y agentes especializados en `.agents/agents/`) programar, auditar, refactorizar y auto-desplegar código continuamente sobre la infraestructura en la nube sin requerir intervención humana constante.

---

## 2. Arquitectura Definitiva REGE (Opción B: OpenClaw como Orquestador Directo)

```text
Entrada Telegram ──► OpenClaw Gateway (:8085) ──(Proceso Nativo / CLI / Local)──► OpenHands / OpenCode ──► /app
                             ▲
                             │ (Llamada HTTP Simple / No MCP)
                             │
                     Dify.AI (:8090)
```

- **Principios de Arquitectura (Opción B):**
  - **Dify.AI (Cerebro Conversacional):** Si la consulta es técnica, realiza una llamada API HTTP simple a OpenClaw (sin requerir proxies MCP stdio→HTTP).
  - **OpenClaw (Orquestador Remoto):** Recibe las instrucciones (vía Telegram o Dify) e invoca a **OpenHands** y **OpenCode** de manera nativa (CLI, spawning de proceso o API local) para modificar el código fuente montado en `/app`.
  - **OpenHands & OpenCode (Ejecutores de Código):** Operan directamente sobre el repositorio eliminando cuellos de botella de infraestructura.
- **Ubicación:** Servidor GCP (`jgis-chatbot-server`), Docker Compose en `/home/jgis/ai-agents/docker-compose.yml`.

---

## 2.1 Directrices Operativas REGE (Seguridad y Calidad)

- **Aislamiento Cloud Absoluto (Cero Uso de Laptop):** Está estrictamente prohibido realizar cualquier compilación, apertura de puertos, inicio de servidores locales o ejecución de despliegues de REGE en la laptop del usuario. Todo el desarrollo, servidores locales dev, agentes y pruebas operan exclusivamente en el VPS GCP y el repositorio remoto de GitHub.
- **Colaboración Continua Antigravity + OpenHands:** Antigravity y OpenHands trabajan en conjunto de forma continua para desarrollar y auditar el código fuente del sistema en todo momento.
- **Desacoplamiento y Modularidad Estricta:** El stack REGE es modular. **OpenClaw** (Gateway), **OpenCode** (CLI de terminal), **OpenHands** (Agente programador) y **Dify.AI** (Conversacional) son bloques independientes. Si hay un fallo, se debe testear y diagnosticar de forma aislada para resolver la causa raíz en ese módulo sin afectar la disponibilidad del resto del sistema.
- **Bucle de Trabajo Ininterrumpido:** Tras completar un punto del backlog, el agente debe continuar de inmediato con el siguiente de forma autónoma.
- **Bucle de Testeo (Límite 3 Intentos):** Cualquier cambio de código en REGE debe testearse. Si la prueba falla 3 veces consecutivas, el agente debe detenerse y buscar opinión/intervención humana. No entregar código que no pase las pruebas con `exit code 0`.
- **Registro Obligatorio de Checkpoints:** Al finalizar con éxito cada tarea, se debe marcar con un checkbox `[x]` en `PROMPT_MAESTRO.md` y `PROMPT_REGE.md`, detallando fecha, causa raíz resuelta y aprendizajes.

---

## 2.2 Flujo Detallado de Comunicación (Orquestación y Conversación)

```text
  [ Entrada Telegram ] ──► [ OpenClaw Gateway ]
                                   │
                                   ├──► (Si el comando es directo de desarrollo)
                                   │    │
                                   │    └──► Invocación MCP a [ OpenHands / OpenCode ] ──► Modifica /app
                                   │
                                   └──► (Si es una consulta conversacional / RAG / Ventas)
                                        │
                                        └──► Envía prompt a [ Dify App API ] (Conversacional)
                                                  │
                                                  └──► Si Dify necesita escribir código:
                                                       Llamada API HTTP ──► [ OpenClaw ]
                                                                                │
                                                                                └──► Ejecución MCP ➔ [ OpenCode ]
```

1. **OpenClaw como Gateway Central de Telegram:**
   * Recibe el mensaje. Si contiene comandos de desarrollo directos (ej. *"OpenHands, crea..."*), OpenClaw ejecuta directamente el MCP Server local de OpenHands o OpenCode.
2. **Dify.AI como Cerebro Conversacional / RAG:**
   * OpenClaw está conectado a la API de Dify (definido en `openclaw.json` bajo `providers.dify`). Si el mensaje del usuario de Telegram requiere atención al cliente, cotización de catálogo o soporte de Valentina, OpenClaw delega el procesamiento conversacional a Dify.
   * Si Dify en algún momento del chat requiere ejecutar comandos o editar archivos, llama a la API HTTP de OpenClaw (puerto `8085`) para ejecutar la tarea.

---

## 3. Componentes del Stack REGE

- **OpenClaw:** Gateway de entrada vía Telegram y API HTTP (`:8085`) para orquestar directamente las ejecuciones.
- **OpenCode Headless:** Entorno CLI virtualizado para ejecución directa de comandos montado en `/app` (`/home/jgis/whatsapp-bot`).
- **OpenHands:** Agente programador de software autónomo operado directamente por OpenClaw.
- **Hostinger MCP Wrapper:** Conector oficial de API para gestionar registros DNS (`jgispublicidad.pe`) con checkpoint humano.
- **Dify.AI:** Cerebro conversacional opcional (delega tareas técnicas a OpenClaw vía HTTP).
- **Wrappers MCP (Legacy/Opcionales):** `opencode-mcp` y `openhands-mcp` se mantienen opcionalmente como bridges SSE para herramientas externas que lo requieran.

---

## 4. Conectores MCP y Delegación de Infraestructura

### 4.1 Hostinger (DNS)
- **Operaciones de Lectura:** Permitidas automáticamente (verificar resolución de registros A/CNAME).
- **Operaciones de Escritura:** Requieren checkpoint de confirmación humana previa (mostrar el registro exacto a modificar antes de ejecutar).

---

## 5. Secuencia de Despliegue & Tracker de Estado REGE
 
- [x] **Paso 1 — Telegram → OpenClaw:** Completado (20/07/2026). Cargar `TELEGRAM_BOT_TOKEN` definitivo y validado en logs.
- [x] **Paso 2 — OpenClaw → Agentes REGE:** Completado (20/07/2026). Conexión nativa entre Telegram y los ejecutores OpenCode / OpenHands. *Causa raíz resuelta (20/07/2026): Se determinó que OpenClaw no admite mcp/mcpServers en su openclaw.json y que la validación estricta de Zod causaba crashes. Se removió la inyección inválida de mcp en openclaw.json y se configuraron correctamente los proveedores dify y deepseek. El bot y los agentes se comunican a través de Dify.AI (que conecta directamente con opencode-mcp y openhands-mcp).*
- [x] **Paso 3 — OpenClaw → OpenCode / OpenHands (invocación nativa):** Completado (20/07/2026). Pruebas de ejecución autónoma directa en `/app` con DeepSeek V3/R1 sin proxies MCP intermedios.
 
> **Nota de Infraestructura Base:** Los Pasos 4 al 8 corresponden al aprovisionamiento de la plataforma servidora (Nginx SSL, DNS Hostinger, Chatwoot y pipeline Git Auto-Deployer) sobre la cual se apoya el ecosistema agéntico REGE.

- [x] **Paso 4 — Prueba E2E de Bajo Riesgo:** Completada (19/07/2026).
- [x] **Paso 5 — DNS Chatwoot vía Hostinger:** Completada (19/07/2026).
- [x] **Paso 6 — Nginx SSL Certbot Chatwoot:** Completada (19/07/2026).
- [x] **Paso 7 — Migración de Agentes Dify a Native Console:** Completada (19/07/2026).
- [x] **Paso 8 — Pipeline Git ➔ Auto-Deploy VPS:** Implementado (19/07/2026) con HMAC-SHA256 y webhook `jgis-deployer` en puerto 9000. *Fix (21/07/2026): Se cambió la URL del HEALTHCHECK de localhost a 127.0.0.1 en Dockerfile.deployer para evitar que Alpine intente IPv6 y marque el contenedor como unhealthy.*

---

## 6. Comandos de Control (REGE)

```bash
cd /home/jgis/ai-agents
sudo docker compose up -d --force-recreate openclaw opencode openhands-mcp
sudo docker logs jgis-openclaw -f
```

