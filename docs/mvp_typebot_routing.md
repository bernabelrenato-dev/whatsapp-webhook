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
