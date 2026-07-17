# 🗺️ Mapa de Contexto del Proyecto (Protocolo TEP)

Este archivo reemplaza el empaquetado de código completo para optimizar y reducir el uso de tokens. 
Para analizar o modificar un archivo, consúltelo en este índice y cárguelo bajo demanda utilizando la herramienta de visualización de archivos.

## 🌳 Estructura de Directorios
```text
├── .agents/
│   ├── agents/
│   │   ├── CatalogSpecialist/
│   │   │   └── agent.json
│   │   ├── MetaAdsIntegrator/
│   │   │   └── agent.json
│   │   ├── QATester/
│   │   │   └── agent.json
│   │   └── SeniorDevReviewer/
│   │       └── agent.json
│   └── skills/
│       ├── ai-token-economy/
│       │   └── SKILL.md
│       ├── catalog-extractor/
│       │   └── SKILL.md
│       ├── database-sheets-sync/
│       │   └── SKILL.md
│       ├── meta-ad-kit-deployer/
│       │   └── SKILL.md
│       ├── paid-ads/
│       │   └── SKILL.md
│       ├── whatsapp-automation/
│       │   └── SKILL.md
│       └── whatsapp-cloud-api/
│           ├── assets/
│           │   ├── boilerplate/
│           │   │   ├── nodejs/
│           │   │   │   ├── src/
│           │   │   │   │   ├── index.ts
│           │   │   │   │   ├── template-manager.ts
│           │   │   │   │   ├── types.ts
│           │   │   │   │   ├── webhook-handler.ts
│           │   │   │   │   └── whatsapp-client.ts
│           │   │   │   ├── .env.example
│           │   │   │   ├── package.json
│           │   │   │   └── tsconfig.json
│           │   │   └── python/
│           │   │       ├── .env.example
│           │   │       ├── app.py
│           │   │       ├── requirements.txt
│           │   │       ├── template_manager.py
│           │   │       ├── webhook_handler.py
│           │   │       └── whatsapp_client.py
│           │   └── examples/
│           │       ├── flow-example.json
│           │       ├── interactive-menu.json
│           │       ├── template-messages.json
│           │       └── webhook-payloads.json
│           ├── references/
│           │   ├── advanced-features.md
│           │   ├── api-reference.md
│           │   ├── automation-patterns.md
│           │   ├── compliance.md
│           │   ├── message-types.md
│           │   ├── setup-guide.md
│           │   ├── template-management.md
│           │   └── webhook-setup.md
│           ├── scripts/
│           │   ├── send_test_message.py
│           │   ├── setup_project.py
│           │   └── validate_config.py
│           └── SKILL.md
├── scripts/
│   ├── database/
│   │   ├── add-stock-column.sql
│   │   ├── apply-permanent-fix.js
│   │   ├── apply-permanent-fix.sql
│   │   ├── apply-v6-inline-webhook-final.js
│   │   ├── apply-v6-inline-webhook-final.sql
│   │   ├── apply-v6-inline-webhook.js
│   │   ├── apply-v6-inline-webhook.sql
│   │   ├── apply-valentina-full-fix.js
│   │   ├── apply-valentina-full-fix.sql
│   │   ├── apply-webhook-id-fix.js
│   │   ├── apply-webhook-id-fix.sql
│   │   ├── create-catalog-table.sql
│   │   ├── create-test-bot.js
│   │   ├── create-test-bot.sql
│   │   ├── debug-session-state.sql
│   │   ├── fix-blocks-outgoing-edges.js
│   │   ├── fix-blocks-outgoing-edges.sql
│   │   ├── fix-edges-v6.sql
│   │   ├── fix-start-edge-v2.js
│   │   ├── fix-start-edge.js
│   │   ├── fix-test-bot-start-event.js
│   │   ├── fix-test-bot-start-event.sql
│   │   ├── fix-valentina-start-event.js
│   │   ├── fix-valentina-start-event.sql
│   │   ├── fix-webhook-casing.js
│   │   ├── fix-webhook-casing.sql
│   │   ├── fix-webhook-database-settings.js
│   │   ├── fix-webhook-database-settings.sql
│   │   ├── generate-sql.js
│   │   ├── update-edges-v2.sql
│   │   ├── update-edges.sql
│   │   └── update.sql
│   ├── extract/
│   │   ├── extract-block-types.js
│   │   ├── extract-block-utils.js
│   │   ├── extract-bubble-parser.js
│   │   ├── extract-execute-integration-code.js
│   │   ├── extract-execute-integration.js
│   │   ├── extract-get-starting-point.js
│   │   ├── extract-http-request-block.js
│   │   ├── extract-mapping-runner.js
│   │   ├── extract-module-54502.js
│   │   ├── extract-module.js
│   │   ├── extract-outgoing-edge-helper.js
│   │   ├── extract-save-variable-mapping.js
│   │   ├── extract-ssrf-details.js
│   │   ├── extract-start-bot-flow.js
│   │   ├── extract-start-session-details.js
│   │   ├── extract-start-session.js
│   │   └── extract-walk-flow-forward.js
│   ├── tests/
│   │   ├── analyze_lists.js
│   │   ├── debug-session-state.js
│   │   ├── print-D-def.js
│   │   ├── print-webhooks.js
│   │   ├── test-continue-chat.js
│   │   ├── test-db-sync.js
│   │   ├── test-full-chat-flow.js
│   │   └── validate-edges.js
│   ├── tools/
│   │   ├── check_quotes.js
│   │   ├── compile_catalog.js
│   │   ├── create_gcp_resources.ps1
│   │   ├── extract_images.js
│   │   ├── extract-all-catalogs.js
│   │   ├── extract-cheaper-to-csv.js
│   │   ├── find-54502.js
│   │   ├── find-anywhere.js
│   │   ├── find-bubble-parser.js
│   │   ├── find-D-definition.js
│   │   ├── find-integration-executor.js
│   │   ├── find-is-integration-block.js
│   │   ├── find-session-not-found.js
│   │   ├── find-ssrf-check.js
│   │   ├── find-start-chat-in-container.js
│   │   ├── find-starting-point.js
│   │   ├── find-variable-mapper.js
│   │   ├── find-webhook-id-occurrences.js
│   │   ├── generate-project-map.js
│   │   ├── get-webhook-config.js
│   │   ├── inspect-public-typebot.js
│   │   ├── nginx.conf.example
│   │   ├── run-sync.js
│   │   ├── search-D.js
│   │   ├── search-index.js
│   │   ├── setup_vps.sh
│   │   ├── tunnel.js
│   │   ├── tunnel.txt
│   │   └── update-meta-webhook.js
│   ├── audit_docs_output_utf8.txt
│   ├── audit_docs_output.txt
│   ├── audit_docs.js
│   ├── audit_excel_output_utf8.txt
│   ├── audit_excel_output.txt
│   ├── audit_excel.js
│   ├── detailed_audit_results_v2.json
│   ├── detailed_audit_results_v3.json
│   ├── detailed_audit_results_v4.json
│   ├── detailed_audit_results.json
│   ├── detailed_audit_v2.js
│   ├── detailed_audit_v3.js
│   ├── detailed_audit_v4.js
│   ├── detailed_audit.js
│   ├── generate_report.js
│   ├── parse_docx_tables.js
│   ├── test_docx.js
│   ├── test_efstock.js
│   ├── test_exports.js
│   └── test_pdf.js
├── src/
│   ├── config/
│   │   ├── botPersonality.js
│   │   ├── catalog.json
│   │   └── environment.js
│   ├── controllers/
│   │   ├── api.controller.js
│   │   ├── chatwoot.controller.js
│   │   └── webhook.controller.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── signatureValidator.js
│   ├── public/
│   │   └── images/ (Contiene imágenes del catálogo - excluidas para ahorro de tokens)
│   ├── routes/
│   │   ├── api.routes.js
│   │   └── webhook.routes.js
│   ├── services/
│   │   ├── catalog.service.js
│   │   ├── dbSync.service.js
│   │   ├── gemini.service.js
│   │   ├── message.service.js
│   │   └── queue.service.js
│   ├── utils/
│   │   └── logger.js
│   ├── app.js
│   └── server.js
├── .env
├── .env.example
├── .gitignore
├── catalogo_borrador.csv
├── package.json
├── repomix.config.json
└── resumen_avances_actuales.md
```

## 📂 Índice de Archivos Clave (Lazy Loading)
| Directorio / Archivo | Responsabilidad / Descripción (Cargar bajo demanda con view_file) |
| :--- | :--- |
| [src/server.js](file:///C:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/src/server.js) | Punto de entrada del servidor Webhook de WhatsApp (Puerto 3000). |
| [src/app.js](file:///C:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/src/app.js) | Configuración de Express, middlewares de firma HMAC y rutas globales. |
| [src/routes/api.routes.js](file:///C:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/src/routes/api.routes.js) | Definición de rutas públicas y endpoints de webhook. |
| [src/controllers/api.controller.js](file:///C:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/src/controllers/api.controller.js) | Controladores para peticiones de webhook y consultas del catálogo. |
| [src/services/message.service.js](file:///C:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/src/services/message.service.js) | Servicio núcleo de WhatsApp: descarga multimedia de Meta, procesa imágenes y texto, y rutea flujos. |
| [src/services/gemini.service.js](file:///C:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/src/services/gemini.service.js) | Servicio de integración de Gemini AI: búsqueda visual por similitud de productos y FAQ conversacionales. |
| [src/services/catalog.service.js](file:///C:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/src/services/catalog.service.js) | Servicio del catálogo de productos: búsqueda de stock, cálculo de escalas de precios y cotizaciones. |
| [src/utils/logger.js](file:///C:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/src/utils/logger.js) | Configuración del registrador de logs estructurado del sistema. |
| [scripts/tests/](file:///C:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/scripts/tests/) | Carpeta con simulaciones de flujos de chat E2E y scripts de validación de base de datos. |
| [scripts/database/](file:///C:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/scripts/database/) | Carpeta con parches SQL y JS de migración y alineación de Typebot. |
| [scripts/tools/](file:///C:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/scripts/tools/) | Herramientas de compilación de catálogo, túneles locales y generador de mapa de proyecto. |
| [.agents/](file:///C:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/.agents/) | Carpeta de personalizaciones: habilidades (skills) y configuraciones de subagentes especializados. |

