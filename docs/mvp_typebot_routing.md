# Documentación de Enrutamiento MVP: Typebot ➔ Capa IA ➔ Humano

Este documento registra los detalles del enrutamiento de tres capas para el ecosistema de JGIS Publicidad.

---

## 1. Causa Raíz Encontrada (Bug de Enrutamiento)
* **Diagnóstico:** Anteriormente en `message.service.js`, las comprobaciones de intención de catálogo (`isCatalogIntent` basada en palabras clave como "precio", "taza", "cotizar") y la presencia de imágenes (`hasImage`) se evaluaban **antes** que el flujo de Typebot.
* **El efecto:** Si un nuevo cliente iniciaba la conversación diciendo algo tan simple como *"hola, quiero cotizar"* o enviando una foto, el bot lo derivaba de forma inmediata a la capa de IA (Gemini/DeepSeek), omitiendo a Typebot por completo en su primera toma de contacto.

---

## 2. Cambios Implementados
* **Ruteo Comercial de Tres Capas:**
  1. **Conversaciones Nuevas:** Si el cliente no tiene una sesión activa registrada en `userSessions`, **siempre** inicia en la Capa Filtro (Typebot).
  2. **Persistencia del Estado de la Sesión:** Almacenamos el estado en el caché de sesiones de la siguiente manera: `{ sessionId, state: 'typebot' | 'ai' }`.
  3. **Transición Automática a Capa IA:** Cuando Typebot devuelve una respuesta sin inputs adicionales (`!input`), el backend detecta el fin del flujo estructurado y cambia el estado de la sesión a `'ai'`. En el siguiente mensaje, el cliente pasa de forma transparente a ser atendido por Gemini/DeepSeek para consultas libres.
  4. **Bypass de Reinicio:** El uso de palabras clave de reinicio (`menu`, `reiniciar`, `hola`) limpia las sesiones y manda al usuario al inicio de Typebot.
  5. **Handover en cualquier punto:** La intención de hablar con un humano (`isAgentIntent`) se evalúa primero, garantizando que el usuario pueda salir del Typebot en cualquier momento.
* **Manejo de Imágenes en Typebot:**
  * Al recibir una imagen en WhatsApp durante la etapa de Typebot, la descargamos de la API de Meta, la guardamos en el directorio público del servidor (`src/public/images/`) y enviamos a Typebot la URL pública en lugar de omitirlo.
* **Parametrización del Bot:**
  * Reemplazamos el ID de Typebot que estaba quemado en el código por la variable de entorno `TYPEBOT_ID`.

---

## 3. Plan de Verificación y Pruebas
Para confirmar que el cambio cumple el criterio de aceptación:
1. **Prueba de Nuevo Usuario:** Envía *"Hola"* al bot desde un número sin chat previo. El bot debe responder con el saludo configurado de Typebot, nunca con Gemini.
2. **Prueba de Categoría Libre:** Continúa el flujo y escribe *"Mochilas ejecutivas"*. Typebot debe aceptarlo como texto plano y avanzar al nodo de cantidad.
3. **Prueba de Persistencia:** Espera unos minutos y responde la cantidad. El flujo debe continuar desde ese nodo sin reiniciarse.
4. **Prueba de Escape Directo:** En cualquier paso del flujo, escribe *"Quiero hablar con un asesor"*. El bot debe pausarse de inmediato y reabrir el chat en Chatwoot.
5. **Prueba de Fin del Flujo:** Completa todos los pasos de Typebot. Una vez finalizado el flujo, el siguiente mensaje libre (ej. *"¿Hacen envíos a Arequipa?"*) debe ser resuelto automáticamente por Gemini/DeepSeek.

---

## 4. Diagnóstico de Integridad de Datos e Incidencia Cloud
* **Evidencia del Problema:** El usuario reportó no ver el bot "JGIS Publicidad Bot" en su panel tras iniciar sesión, visualizando únicamente el workspace vacío "My workspace".
* **Resultado de Consulta de Diagnóstico:**
  * Consulta: `SELECT * FROM "Workspace" WHERE id = 'cmrugyyxj00000ajew6v4qt1f';` ➔ **0 filas**.
  * Consulta: `SELECT id, email FROM "User" WHERE email = 'ventas.centrolima@jgispublicidad.pe';` ➔ **1 fila** (`user-jgis`).
  * Consulta: `SELECT id, name FROM "Typebot";` ➔ **1 fila** (`jgis-publicidad-bot-f33vo50`, vinculado a `workspace-jgis`).
* **Causa Raíz Real:** El ID de workspace `cmrugyyxj00000ajew6v4qt1f` de la captura del usuario pertenece al servicio oficial en la nube de Typebot (`app.typebot.com`), mientras que los inserts locales y la base de datos PostgreSQL se encuentran en el servidor VPS propio (`https://bot.jgispublicidad.pe`).
* **Acción Tomada:** Al comprobar que los datos en el PostgreSQL local están 100% íntegros, consistentes y publicados bajo el ID `jgis-publicidad-bot-f33vo50` en el workspace `workspace-jgis`, la solución es indicar al usuario que inicie sesión en la URL correcta de su servidor local (`https://bot.jgispublicidad.pe`) en lugar del cloud oficial de Typebot.

---

## 5. Diagnóstico y Corrección de Autenticación Self-Hosted
* **Hallazgo Crítico:** Al intentar acceder a `https://bot.jgispublicidad.pe/es/signin`, el sistema mostraba el error *"Necesitas configurar al menos un proveedor de autenticación"*.
* **Causa Raíz:** La regla general `location /api` en Nginx secuestraba todas las solicitudes dirigidas a `/api/auth` (el backend de autenticación NextAuth de Typebot) y las redirigía al contenedor del webhook de WhatsApp (`jgis-webhook` en el puerto 3005) en lugar del contenedor `typebot-builder` (puerto 8081).
* **Solución de Enrutamiento:** Se añadió una regla específica `location /api/auth` en Nginx con mayor precedencia que redirige los flujos de autenticación al puerto `8081` (Typebot Builder). Ahora la petición directa a `https://bot.jgispublicidad.pe/api/auth/providers` devuelve correctamente el proveedor de Nodemailer (`email`) habilitado por el contenedor.
* **Descarte de Instancia Cloud:** Confirmamos explícitamente que la instancia externa `app.typebot.com` queda descartada de la arquitectura del proyecto. Toda la configuración, base de datos y despliegue del bot comercial es 100% local en el VPS (`https://bot.jgispublicidad.pe`).
* **Proveedor SMTP:** Actualmente el contenedor tiene configurado el entorno SMTP de pruebas hacia `MailHog` (puerto `1025` sin auth) lo que permite la entrega exitosa de magic links locales legibles desde `https://bot.jgispublicidad.pe/mailhog/`. Queda pendiente configurar un SMTP transaccional de producción una vez que el usuario decida qué proveedor utilizar (ej. Hostinger).

---

## 6. Diagnóstico y Corrección de Spinner Infinito (/es/typebots)
* **Hallazgo Crítico:** Tras loguearse correctamente, la interfaz redirigía a `/es/typebots` pero se quedaba en un spinner de carga infinito.
* **Causa Raíz:** Las peticiones de la API interna de Typebot (como consultas tRPC `/api/trpc/...` y llamadas de recursos `/api/workspaces/...`) eran secuestradas por la directiva Nginx `/api` que las enviaba al puerto `3005` (nuestro webhook de WhatsApp) en lugar del puerto `8081` (Typebot Builder). El webhook respondía con un error `404` o no respondía en absoluto, imposibilitando la carga del listado de bots en la interfaz de React.
* **Solución de Enrutamiento:** Se reestructuraron las directivas Nginx de la siguiente manera:
  1. Creamos bloques de localización específicos con mayor precedencia para el webhook: `location /api/search` y `location /api/handover` (dirigidos a `localhost:3005`).
  2. Modificamos la directiva general `location /api` para que sirva de puente general hacia `localhost:8081` (Typebot Builder).
  3. Esto permite que todas las llamadas de la API interna de Typebot (`/api/trpc`, `/api/v1/typebots`, etc.) fluyan sin colisiones hacia el Builder, mientras que los webhooks de búsqueda y handover del chatbot WhatsApp siguen ejecutándose con normalidad en el webhook.
* **Resultado:** El listado de bots en `/es/typebots` carga de forma inmediata y el webhook de WhatsApp sigue respondiendo en port 3005.

---

## 7. Verificación de Pruebas Automatizadas E2E
* **Script de Prueba:** Creamos un script de automatización en `scripts/tools/test-typebot-login.js` para simular todo el proceso de inicio de sesión de NextAuth en el contenedor.
* **El Proceso:**
  1. Obtiene el token CSRF mediante `GET /api/auth/csrf`.
  2. Dispara el inicio de sesión enviando un POST a `/api/auth/signin/nodemailer` con cookies persistidas.
  3. Recupera el email en MailHog leyendo `/api/v2/messages`, limpia los soft linebreaks y extrae el token temporal de 6 dígitos.
  4. Realiza el callback en `/api/auth/callback/nodemailer` con redirecciones deshabilitadas en Axios para capturar el header `set-cookie` con el `__Secure-authjs.session-token`.
  5. Consulta `/api/auth/session` pasando las cookies de sesión y valida los datos del usuario.
* **Resultado:**
  * **Status:** **ÉXITO total**.
  * **Datos del usuario autenticado devueltos:** `ventas.centrolima@jgispublicidad.pe` (id: `user-jgis`).
  * **Criterio de Aceptación:** Cumplido con exit code `0`. El enrutamiento y la autenticación self-hosted funcionan de extremo a extremo sin colisiones de Nginx.




