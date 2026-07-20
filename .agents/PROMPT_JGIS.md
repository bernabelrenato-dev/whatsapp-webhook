# PROMPT HIJO — PROYECTO JGIS (Ecosistema de Ventas y Atención al Cliente)

> **Padre:** [PROMPT_MAESTRO.md](file:///c:/Users/USER/.gemini/antigravity/scratch/whatsapp-webhook/.agents/PROMPT_MAESTRO.md)
> **Proyecto:** JGIS Publicidad (Bot Conversacional de WhatsApp "Valentina Ríos")

---

## 1. Visión Estratégica de JGIS Publicidad

Ser la empresa líder y referente en merchandising corporativo, artículos publicitarios personalizados e impresiones de alta definición en el Perú y la región, mediante la integración de inteligencia artificial conversacional (**Valentina Ríos**), automatización omnicanal y procesos de producción y entrega ultrarrápidos. Nuestra visión es transformar la experiencia del cliente corporativo brindando asesoría técnica experta en branding (láser, UV, serigrafía, sublimación, DTF), cotizaciones instantáneas y personalizadas al por mayor, y un traspaso fluido a agentes humanos en Chatwoot cuando se requiera, garantizando máxima confianza, calidad superior y escalabilidad 24/7.

---

## 2. PENDIENTES PRIORITARIOS & AUDITORÍA (JGIS)

> Esta sección tiene **prioridad de ejecución sobre cualquier feature nueva**. Ningún agente debe iniciar trabajo en funcionalidades adicionales del bot mientras existan ítems P0 abiertos. Cada ítem sigue el ciclo de testeo obligatorio (0.1) y el radio de acción de CogSec.

### 2.1 Ítems Auditados y Verificados
- [x] **P0 — Flow de WhatsApp al 100% funcional:** Verificado E2E (20/07/2026). Webhook HMAC-SHA256, sincronización con Chatwoot, handover automático a humanos por 2 horas y envío de plantillas por Graph API Meta.
- [x] **P0 — Chatwoot: correo de invitación no llega a los agentes:** Verificado (20/07/2026). Se corrigió la variable `SMTP_USERNAME` en `chatwoot-web` y `chatwoot-worker`, destrabando los correos enviados a MailHog.
- [x] **P1 — Migración de nombre del bot (Valeria → Valentina):** Verificado (20/07/2026). Cero coincidencias de "Valeria" en todo el código.
- [x] **P1 — Escalamiento a atención humana:** Implementado (20/07/2026). Traspaso automático al solicitar "agente", "asesor" o "humano".
- [x] **P2 — Catálogo de técnicas de branding:** Implementado en `botPersonality.js` (Impresión UV, Láser, Serigrafía, Tampografía, Sublimación, Bordado, DTF).
- [x] **P0 — UPSERT Atómico de Catálogo:** Resuelto en `dbSync.service.js` con `ON CONFLICT (codigo) DO UPDATE SET`, eliminando el `TRUNCATE` destructivo.

---

## 3. Arquitectura del Bot JGIS

```text
Cliente WhatsApp → Nginx (proxy inverso, SSL Let's Encrypt) → Webhook JGIS (:3005, Node.js)
                                                               → Typebot Builder/Viewer (:8081)
                                                               → Chatwoot (:3010, handover a humanos)
Webhook → Gemini AI (function calling) → PostgreSQL + pgvector (catálogo)
Chatwoot → PostgreSQL (persistencia) + Redis :6379 (colas)
```

- **Servidor:** GCP VM (`jgis-chatbot-server`), IP `34.69.161.101`.
- **Docker Compose:** `/home/jgis/whatsapp-bot/docker-compose.yml`.

---

## 4. Modelo de Datos & Reglas de Negocio

### 4.1 Tabla `CatalogProducts`
| Columna | Tipo | Descripción |
|---|---|---|
| `codigo` 🔑 | VARCHAR(100) | Código único de producto |
| `nombre` | VARCHAR(255) | Nombre comercial |
| `precio_venta` | NUMERIC(10,2) | Costo unitario base |
| `color` | VARCHAR(100) | Variantes de color |
| `categoria` | VARCHAR(100) | Ej. `JARROS MUG`, `TOMATODOS` |
| `proveedor` | VARCHAR(100) | Cheaper, Chiper, Efstock, Promoprime, Promos |
| `imagen_url` | VARCHAR(500) | Ruta local / URL de imagen |
| `stock` | INTEGER | Stock disponible |

### 4.2 Escala de Márgenes (sobre costo unitario base)
- **1–5 unidades:** x1.85 (85% margen)
- **6–12 unidades:** x1.40 (40% margen)
- **13–50 unidades:** x1.35 (35% margen)
- **51–499 unidades:** x1.25 (25% margen)
- **500–1000 unidades:** x1.20 (20% margen)

---

## 5. Flujos Clave de Atencion
- **Cotización Automática por Texto:** Gemini interpreta la solicitud → llama a `searchCatalog` → consulta Postgres → calcula margen según volumen → responde con foto e IGV aclarado.
- **Búsqueda por Imagen (2 Etapas):** (1) Gemini Vision genera sinónimos semánticos → (2) Scoring SQL recupera 40 candidatos → (3) Gemini Vision compara la imagen recibida contra los candidatos y selecciona el producto exacto.

---

## 6. Comandos de Control (JGIS)
```bash
cd /home/jgis/whatsapp-bot
sudo docker compose down
sudo docker compose up -d
sudo docker compose up -d --build webhook
sudo docker logs jgis-webhook -f --tail 100
```
