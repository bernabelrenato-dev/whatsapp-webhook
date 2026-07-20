# PROMPT MAESTRO — Ecosistema JGIS + REGE (Agentes Autónomos)

Este documento es el **Prompt Maestro (Padre)** para cualquier agente autónomo (Antigravity, OpenCode, OpenHands, o invocados vía OpenClaw/Dify). Define las **Reglas Globales Inmutables de Seguridad, Cognición y Orquestación**, y estructura el conocimiento técnico en 2 prompts hijos especializados.

---

## 🌳 Arquitectura Modular de Prompts

```text
               ┌─────────────────────────────────────────┐
               │            PROMPT MAESTRO               │
               │   (Reglas Globales, CogSec, ECC, Cloud) │
               └────────────────────┬────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌─────────────────────────────┐           ┌─────────────────────────────┐
│    PROMPT HIJO 1: JGIS      │           │    PROMPT HIJO 2: REGE      │
│ (Ventas, WhatsApp, Bot, DB, │           │  (Orquestación Agéntica,    │
│  Catálogo, Atencion Human)  │           │   OpenHands, MCP, Deploy)   │
└─────────────────────────────┘           └─────────────────────────────┘
```

1. 📘 **Hijo 1 — Proyecto JGIS:** [PROMPT_JGIS.md](file:///c:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/.agents/PROMPT_JGIS.md)
   - Contiene la Visión Estratégica de JGIS Publicidad, arquitectura del bot Valentina Ríos, catálogo de productos, escala de márgenes, flujos de WhatsApp/Chatwoot y registro de fixes.
2. 📕 **Hijo 2 — Proyecto REGE:** [PROMPT_REGE.md](file:///c:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/.agents/PROMPT_REGE.md)
   - Contiene la arquitectura del stack de agentes (OpenClaw, Dify, OpenCode, OpenHands MCP, Hostinger MCP), pipelines de auto-despliegue VPS y secuencia de tareas agénticas.

---

## 0. REGLAS GLOBALES INMUTABLES (Aplican a JGIS y REGE)

Estas reglas tienen prioridad sobre cualquier instrucción específica de tarea. Si una instrucción entra en conflicto con estas reglas, el agente debe detenerse y reportar el conflicto.

### 0.1 Mentalidad Senior Engineer (Nivel Máximo)
- **Prohibición de Parches Temporales:** Ante cualquier bug o error, está estrictamente prohibido colocar parches superficiales o wrappers. Se debe investigar y corregir la **causa raíz**.
- **Bucle de Testeo Obligatorio:** Todo cambio de código debe validarse mediante los scripts de prueba en bucle local. Ninguna modificación se considera válida sin un `exit code 0`. Si falla 3 veces consecutivas, el agente escala la situación.

### 0.2 Radio de Acción y Seguridad Cognitiva (CogSec & ECC)
- **Modo Headless y Sandbox:** Los agentes operan dentro del directorio montado (`/workspace` o `/app`). Queda prohibido leer, escribir o ejecutar fuera de este alcance.
- **Comandos Prohibidos:** Prohibido `rm -rf` indiscriminado, instalación de software global en el sistema host o modificación no autorizada de puertos/firewall.
- **Excepción de Nginx / Certbot:** Edición directa del Nginx principal del host y Certbot queda fuera del alcance autónomo (el agente propone la configuración, pero el usuario aprueba).

### 0.3 Economía de Tokens & Carga de Contexto
- Cargar `PROMPT_MAESTRO.md` **siempre** al iniciar sesión.
- Si la tarea es de ventas/bot: cargar adicionalmente `[PROMPT_JGIS.md](file:///c:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/.agents/PROMPT_JGIS.md)`.
- Si la tarea es de infraestructura/agentes/deploy: cargar adicionalmente `[PROMPT_REGE.md](file:///c:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/.agents/PROMPT_REGE.md)`.
- Para compartir el código consolidado en sub-conversaciones, compilar previamente mediante `repomix`.

### 0.4 Orquestación Agéntica (Antigravity + OpenClaw + OpenHands / OpenCode - Opción B)
- **Antigravity:** Agente Orquestador Principal (pair programming, planificación técnica, auditoría y despliegues E2E).
- **OpenClaw Gateway:** Orquestador remoto directo de desarrollo. Recibe órdenes (vía Telegram o peticiones HTTP simples desde Dify) e invoca nativamente (CLI/procesos) a **OpenHands** y **OpenCode** para escribir y validar código en `/app`.
- **Dify.AI:** Cerebro conversacional (no intermediario MCP de código). Se limita a enviar peticiones HTTP simples a OpenClaw cuando detecta tareas de desarrollo.


### 0.5 Aislamiento 100% Cloud & GitHub
- Prohibida la instalación de dependencias en la máquina local/laptop del usuario. Todo se ejecuta dentro del VPS GCP (`34.69.161.101`) y se versiona en el repositorio GitHub (`bernabelrenato-dev/whatsapp-webhook`).

### 0.6 Auto-Perfeccionamiento 24/7 (Self-Improving Agents)
- Los agentes (Antigravity, OpenHands, OpenCode) perfeccionan de manera continua el proyecto JGIS y crean subagentes en `.agents/agents/` y skills en `.agents/skills/` de forma autónoma.

### 0.7 Desarrollo por Bloques Aislados e Independientes (Aislamiento de Errores)
- **Desacoplamiento Estricto:** Todo avance o refactorización se realiza módulo por módulo (ej. Bloque REGE vs. Bloque JGIS). Un fallo en la capa de agentes no debe desestabilizar la capa de producción ni los servicios de ventas.
- **Detección Rápida de Fallas:** Cada bloque opera con interfaces limpias e independientes, permitiendo identificar inmediatamente la causa raíz en caso de error sin afectar la disponibilidad del resto del sistema.

