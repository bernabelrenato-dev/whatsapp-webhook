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

## 2. Calidad de Código y Evitación de Parches
*   **Enfoque de Causa Raíz:** Ante cualquier error, bug o fallo en las pruebas, el agente debe investigar la causa original del problema en lugar de aplicar parches superficiales o "wrappers" de código sobre el error.
*   **Ciclos de Testeo Locales (Bucle de Corrección):**
    *   Cualquier refactorización o cambio de código en los módulos (como el cotizador, sincronización de base de datos o enrutador) debe ser validado ejecutando los scripts de prueba correspondientes en un bucle local.
    *   No se darán cambios por válidos hasta que la suite de testeo local termine con exit code `0`.
*   **Preservación de Estructura:** No mover, renombrar o crear directorios principales de forma ad-hoc sin alinear con la arquitectura del proyecto (`src`, `scripts`, `.agents`).

---

## 3. Economía de Tokens
*   **Uso de Repomix:** Para compartir contexto del proyecto entre agentes, siempre se debe generar un archivo consolidado comprimido mediante **Repomix** para optimizar los tokens de entrada y evitar transferencias innecesarias de archivos redundantes.
*   **Respuestas Concisas:** Los agentes de backend deben comunicarse mediante JSONs estructurados y texto resumido, evitando explicaciones verbose e innecesarias que consuman ventana de contexto.
