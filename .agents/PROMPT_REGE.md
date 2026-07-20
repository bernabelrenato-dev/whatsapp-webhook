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
- [x] **Paso 2 — OpenClaw → Agentes REGE:** Completado (20/07/2026). Conexión nativa entre Telegram y los ejecutores OpenCode / OpenHands.
- [x] **Paso 3 — OpenClaw → OpenCode / OpenHands (invocación nativa):** Completado (20/07/2026). Pruebas de ejecución autónoma directa en `/app` con DeepSeek V3/R1 sin proxies MCP intermedios.
 
> **Nota de Infraestructura Base:** Los Pasos 4 al 8 corresponden al aprovisionamiento de la plataforma servidora (Nginx SSL, DNS Hostinger, Chatwoot y pipeline Git Auto-Deployer) sobre la cual se apoya el ecosistema agéntico REGE.

- [x] **Paso 4 — Prueba E2E de Bajo Riesgo:** Completada (19/07/2026).
- [x] **Paso 5 — DNS Chatwoot vía Hostinger:** Completada (19/07/2026).
- [x] **Paso 6 — Nginx SSL Certbot Chatwoot:** Completada (19/07/2026).
- [x] **Paso 7 — Migración de Agentes Dify a Native Console:** Completada (19/07/2026).
- [x] **Paso 8 — Pipeline Git ➔ Auto-Deploy VPS:** Implementado (19/07/2026) con HMAC-SHA256 y webhook `jgis-deployer` en puerto 9000.

---

## 6. Comandos de Control (REGE)

```bash
cd /home/jgis/ai-agents
sudo docker compose up -d --force-recreate openclaw opencode openhands-mcp
sudo docker logs jgis-openclaw -f
```

