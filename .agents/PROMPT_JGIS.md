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
- [x] **P1 — Pacing de Mensajería (Cola de Debounce):** Implementado (20/07/2026). El bot agrupa los mensajes que llegan con menos de 8 segundos de diferencia para responder con un único mensaje unificado.
- [x] **P1 — Soporte de Redes Sociales Multicanal (Messenger/Instagram):** Implementado (20/07/2026). Captura los mensajes de inboxes externos en Chatwoot y los responde usando Gemini/Typebot, traduciendo las opciones interactivas de WhatsApp a texto.
- [x] **P1 — Sincronización de Imágenes en Chatwoot:** Implementado (20/07/2026). Descarga los archivos multimedia de Meta y los sube a Chatwoot en formato `multipart/form-data` para que el agente humano los visualice en la conversación.
- [x] **P1 — Acceso a Typebot Builder en Raíz:** Implementado (20/07/2026). Configurada la variable `NEXTAUTH_URL` y el proxy de Nginx en la raíz `/` para habilitar el login y desarrollo estable en Typebot.
- [x] **P1 — Atribución Meta Ads (Referrals) en Chatwoot:** Implementado (21/07/2026). El bot extrae metadatos del anuncio (Headline, Body, ID e Imagen) y los adjunta como nota privada en Chatwoot.
- [x] **P1 — Alerta Sonora de Handoff en Chatwoot:** Implementado (21/07/2026). Al detectar intenciones de atención humana, el bot cambia el estado de la conversación en Chatwoot a "open", disparando el sonido nativo de notificación en los navegadores de los agentes.
- [x] **P0 — Typebot: Error de proveedor de autenticación:** Resuelto (21/07/2026). Se configuró `NEXTAUTH_SECRET` en el contenedor `typebot-builder` en `docker-compose.yml`, habilitando el inicio de sesión passwordless de NextAuth.
- [x] **P1 — Resiliencia en Pausa Humana (Evitar Chat Muerto):** Implementado (21/07/2026). Si el bot se pausa por solicitud del cliente o fallback de error (tipo `'user'`), y el asesor humano no responde después de 10 minutos de inactividad, el bot despausa automáticamente al cliente si continúa escribiendo. Las palabras clave de reinicio (como "reiniciar" o "menu") despausan la conversación inmediatamente.
- [x] **P1 — Optimización de Imágenes Outbound Chatwoot (Soporte 4K):** Implementado (21/07/2026). Se integró `imageProcessor.js` que intercepta adjuntos de Chatwoot, los comprime (soporte 4K) y los sirve públicamente en `/public/images/` evitando bloqueos de Rails ActiveStorage/Meta.
- [x] **P1 — Respuesta Automática a Anuncios Meta Ads (WhatsApp & Meta Channels):** Implementado (21/07/2026). Al recibir `referral`, el bot responde automáticamente enviando la imagen del anuncio seguida del speech de ventas enriquecido con emojis, datos bancarios (BCP, Yape/Plin) y dirección exacta de tienda en Centro Lima.


---

## 2.2 Directrices Operativas JGIS
- **Aislamiento Cloud Absoluto (Cero Uso de Laptop):** Está estrictamente prohibido realizar cualquier compilación, inicio de servidores locales o ejecución de pruebas de JGIS Bot en la laptop del usuario. Todo el backend, Webhooks, bases de datos y flujos de mensajería se ejecutan exclusivamente en la nube (GCP) y se versionan en GitHub.
- **Sincronización de Hitos:** Cada mejora o corrección sobre el bot JGIS debe registrarse con su checkbox correspondiente en este documento.

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
