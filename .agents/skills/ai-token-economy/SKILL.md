# Skill: AI Token Economy Protocol (TEP)

Protocolo de buenas prácticas y directrices para optimizar al máximo el uso y consumo de tokens del modelo de lenguaje durante las sesiones de programación en pareja y refinamiento.

---

## 1. Reglas de Consulta Eficiente (Lectura de Archivos)

*   **Prohibido Leer Archivos Completos**: Nunca utilices la herramienta de ver archivos para leer todo el archivo si solo necesitas una sección. Usa siempre los parámetros `StartLine` y `EndLine` para aislar el fragmento de código relevante (ej: ver solo 15 o 30 líneas de un servicio).
*   **Filtrado por Grep**: Utiliza búsquedas precisas con `grep_search` para localizar variables o funciones en lugar de buscar manualmente navegando por múltiples carpetas.

---

## 2. Optimización del Contexto Unificado (Repomix)

Para evitar que el archivo de contexto `project-context.md` crezca exponencialmente con tokens basura:
*   **Compresión y Minificación**: Configurar siempre `"removeComments": true` y `"removeEmptyLines": true` en `repomix.config.json` para remover comentarios y líneas en blanco de los archivos empacados.
*   **Ignorar Binarios e Imágenes**: Excluir carpetas multimedia (`src/public/images/`).
*   **Ignorar Archivos Temporales, Logs e Inyecciones SQL**: Excluir logs (`*.log`), scripts de extracción (`scripts/extract/`), y archivos de consulta SQL extensos (`scripts/database/*.sql`).
*   **Ignorar Librerías (`node_modules`)**: Excluir dependencias de Node.js.

---

## 3. Ediciones de Código Precisas (Escritura)

*   **Modificaciones Puntuales**: Utiliza siempre `replace_file_content` especificando el bloque exacto (`TargetContent`) y el reemplazo. Nunca reescribas o sobrescribas el archivo completo (`Overwrite: true`) a menos que sea una creación de archivo inicial.
*   **Ediciones Múltiples**: Si editas varias líneas separadas de un mismo archivo, usa `multi_replace_file_content` en un único paso en lugar de hacer llamadas sucesivas.

---

## 4. Economía de Subagentes

*   **Evitar Subagentes para Tareas Cortas**: Crear y delegar tareas a subagentes duplica el consumo de tokens (ya que cada subagente arranca una conversación independiente con su propio prompt y archivos de contexto). Utiliza subagentes únicamente para tareas complejas o asíncronas de larga duración.
*   **Reutilizar Conversaciones**: Si un subagente ya está activo en segundo plano, envíale instrucciones adicionales mediante mensajes en lugar de crear un subagente nuevo.

---

## 5. Estilo de Comunicación Conciso

*   **Respuestas Directas**: Evita rodeos, resúmenes redundantes de código o explicaciones teóricas largas a menos que el usuario lo solicite. Ahorra tokens respondiendo de forma técnica, concisa y yendo al grano.
