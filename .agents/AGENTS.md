# Reglas Generales de Agentes IA (ECC & CogSec) — JGIS Publicidad

Este documento define las directrices cognitivas de seguridad (CogSec), buenas prácticas de desarrollo y limitaciones del entorno para todos los agentes autónomos que operan en este repositorio.

## Orquestación

**Antigravity** es el orquestador principal. Los agentes ejecutores son:
- **OpenCode** — ejecución de código headless en el VPS
- **OpenHands** — agente programador autónomo
- **OpenClaw** — gateway de entrada vía Telegram

Los agentes locales definidos en `.agents/agents/` son subagentes especializados invocables por el orquestador:
| Agente | Rol |
|--------|-----|
| ValentinaRios | Asistente de catálogo y precios WhatsApp |
| MetaAdsCopywriter | Redactor creativo de Meta Ads (PAS/BAB) |
| RAGSoporte | Soporte de políticas y envíos |
| CatalogSpecialist | Ingeniería de datos de inventario |
| MetaAdsIntegrator | Integraciones Meta Ads API / CAPI |
| QATester | Testing de chatbot y flujos E2E |
| SeniorDevReviewer | Auditoría de arquitectura y seguridad |

## Auto-Deploy

Pipeline Git → VPS configurado en `scripts/deploy/`:
1. `git push main` → GitHub envía webhook a `https://bot.jgispublicidad.pe/deploy-webhook`
2. `webhook-listener.js` valida firma HMAC-SHA256
3. `deploy.sh` ejecuta `git pull` + `docker compose up -d --build webhook`
4. Health check automático con rollback si falla

---

## 1. Seguridad Cognitiva (CogSec) y Control de Daños
*   **Radio de Acción Limitado:** Los agentes autónomos operan en modo headless (auto-aprobación). Por seguridad, los agentes tienen estrictamente prohibido realizar cualquier acción fuera del directorio montado `/workspace` (o `/app` según corresponda).
*   **Comandos Prohibidos:** 
    *   No ejecutar `rm -rf` sobre directorios raíz o fuera del proyecto.
    *   No instalar software a nivel de sistema del host (todas las instalaciones adicionales deben ser locales o dockerizadas).
    *   No exponer puertos al exterior de forma manual utilizando comandos de red del host.
*   **Auditoría de Dependencias:** Todos los wrappers y librerías de la comunidad externas son considerados dependencias auditables. No se deben utilizar versiones `latest` ni fuentes no oficiales sin previa verificación y fijación de tags específicos.

---

## 2. Calidad de Código, Evitación de Parches y Modo Bucle/Loop Obligatorio
*   **Enfoque de Causa Raíz:** Ante cualquier error, bug o fallo en las pruebas, el agente debe investigar la causa original del problema en lugar de aplicar parches superficiales o "wrappers" de código sobre el error.
*   **Modo Bucle/Loop Ininterrumpido (ECC):**
    *   Todo desarrollo, refactorización o solución de errores se ejecuta en **Modo Loop / Bucle continuo**. El agente no se detiene a preguntar al usuario entre pasos; debe iterar de manera autónoma hasta lograr `EXIT CODE 0`.
    *   Cualquier refactorización o cambio de código debe ser validado ejecutando los scripts de prueba correspondientes en un bucle local.
*   **Preservación de Estructura:** No mover, renombrar o crear directorios principales de forma ad-hoc sin alinear con la arquitectura del proyecto (`src`, `scripts`, `.agents`).

---

## 3. Desactivación de IA y Delegación 100% a Typebot
*   **Cero Respuestas por LLM (Gemini / DeepSeek):** Se prohíbe explícitamente responder mensajes de ventas usando Gemini o DeepSeek. **Todas las interacciones de atención y venta son procesadas 100% por Typebot Engine (`typebot-viewer`).**
*   **Flujo Comercial de Gorras Trucker:** Toda entrada por anuncios de Meta Ads debe dirigirse al flujo estandarizado de Typebot en 6 pasos.

---

## 4. Aislamiento Total Cloud, GitHub & Concordancia de Entornos
*   **100% Ejecución en la Nube:** Está strictly prohibido exigir o realizar instalaciones de software, CLI o dependencias en la laptop o máquina local del usuario.
*   **Concordancia Nube (VPS GCP):** Todo cambio y prueba visual debe sincronizarse y desplegarse en el VPS de producción (`jgis-chatbot-server`). Lo que se construye se prueba directamente en la infraestructura cloud para garantizar que la pantalla del usuario y la respuesta del servidor coincidan al 100%.

---

## 6. Desarrollo por Bloques Aislados e Independientes (Aislamiento de Errores)
* **Principio de Desacoplamiento:** Todo desarrollo, corrección o expansión debe realizarse estrictamente por **bloques o módulos independientes**. Ningún cambio en el stack de agentes (REGE) debe alterar o afectar los servicios de negocio de JGIS (bot de WhatsApp, webhook, Chatwoot, DB).
* **Independencia de Componentes REGE:** **OpenClaw** (Gateway), **OpenCode** (CLI), **OpenHands** (Programador) y **Dify** (Conversacional) son módulos aislados. Un fallo en uno no altera la disponibilidad ni ejecución de los demás.
* **Control de Radio de Daño (Blast Radius):** Si un bloque o servicio experimenta un fallo, el error debe ser capturado y aislado exclusivamente dentro de ese módulo.

---

## 7. Bucle de Trabajo Ininterrumpido, Testeo y Checkpoints Obligatorios
* **Flujo Continuo:** Tras finalizar un ítem o tarea del backlog, el agente pasa automáticamente al siguiente ítem en bucle ininterrumpido sin esperar intervención previa.
* **Bucle de Testeo y Verificación Dual (Post-Deploy):**
  - Tras **cada despliegue (deploy)** en el VPS, es **estrictamente obligatorio** ejecutar la prueba dual `scripts/test_whatsapp_and_messenger.js`.
  - La prueba debe simular y validar **exactamente 2 mensajes entrantes en WhatsApp** y **exactamente 2 mensajes entrantes en Messenger** obteniendo `EXIT CODE 0`.
* **Actualización Inmediata de Documentación:** Tras validar la solución, el agente actualiza la documentación oficial con fecha y síntesis de aprendizaje.
