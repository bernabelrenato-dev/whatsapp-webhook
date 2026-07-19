import os

path = '/home/jgis/whatsapp-bot/.agents/PROMPT_MAESTRO.md'
if os.path.exists(path):
    text = open(path).read()
    
    old_steps = """### 3.2 Pasos

- [ ] **Paso 1 — Telegram → OpenClaw.** Confirmar `TELEGRAM_BOT_TOKEN` real en `/home/jgis/ai-agents/.env`, reiniciar OpenClaw, enviar mensaje de prueba y confirmar en logs (`sudo docker logs jgis-openclaw -f`) que llega. **Checkpoint humano: sí** (primer eslabón, valida a mano).
- [ ] **Paso 2 — OpenClaw → Dify.** Crear en Dify una App tipo Agente con acceso a la herramienta MCP de OpenCode. Apuntar OpenClaw a esa App vía su API key. **Checkpoint humano: sí** (requiere que definas el flujo en Dify, aún en curva de aprendizaje).
- [ ] **Paso 3 — Dify → OpenCode MCP → OpenCode.** Recrear contenedores (`up -d --force-recreate opencode opencode-mcp`), probar con tarea trivial ("lista los archivos en /app"). **Checkpoint humano: sí — no avanzar al Paso 4 sin confirmar esto manualmente.**
- [ ] **Paso 4 — Prueba end-to-end de bajo riesgo.** Tarea reversible (ej. corregir un typo en un comentario del webhook) de punta a punta por el pipeline completo. A partir de aquí el bucle de auto-refinamiento puede correr sin checkpoint humano en cada paso.
- [ ] **Paso 5 — DNS de Chatwoot (vía conector Hostinger, Sección 4.1).** Verificar si `chatwoot.jgispublicidad.pe` ya resuelve a `34.69.161.101`; si no existe, el agente propone el registro A exacto. **Checkpoint humano: sí, antes de crear/sobreescribir el registro.**
- [ ] **Paso 6 — Certbot + bloque Nginx para Chatwoot.** El agente prepara (no ejecuta) el bloque `server` de Nginx para `chatwoot.jgispublicidad.pe` y el comando exacto `sudo certbot --nginx -d chatwoot.jgispublicidad.pe`. **Checkpoint humano: sí, siempre — ejecución manual por el usuario o su socio** (regla 0.2, radio de daño cubre todo el proxy inverso).
- [ ] **Paso 7 — Backlog alto riesgo JGIS.** Atacar el TRUNCATE del sync de catálogo (ver 1.5, ítem 1).
- [ ] **Paso 8 — Backlog prioridad media.** Intent Router, migración cloud residual, etc. (ver 1.5 y 2.3)."""

    new_steps = """### 3.2 Pasos

- [x] **Paso 0 — Conexión y Concurrencia de MCPs.** Implementar bridge de comunicación SSE multi-cliente robusto y libre de fragmentación. Conectar Hostinger MCP en Dify (219 herramientas cargadas) y OpenCode MCP. Habilitar OpenHands MCP desactivando la protección restrictiva de DNS rebinding. (Completado: 18-Jul-2026, Aprendizaje: Dify API+Worker realizan conexiones concurrentes al mismo MCP, requiriendo aislamiento de procesos independientes y buffer de streams por líneas).
- [ ] **Paso 1 — Telegram → OpenClaw.** Confirmar `TELEGRAM_BOT_TOKEN` real en `/home/jgis/ai-agents/.env`, reiniciar OpenClaw, enviar mensaje de prueba y confirmar en logs (`sudo docker logs jgis-openclaw -f`) que llega. **Checkpoint humano: sí** (primer eslabón, valida a mano).
- [ ] **Paso 2 — OpenClaw → Dify.** Crear en Dify una App tipo Agente con acceso a la herramienta MCP de OpenCode. Apuntar OpenClaw a esa App vía su API key. **Checkpoint humano: sí** (requiere que definas el flujo en Dify, aún en curva de aprendizaje).
- [ ] **Paso 3 — Dify → OpenCode MCP → OpenCode.** Registrar OpenCode MCP en Dify, probar con tarea trivial ("lista los archivos en /app"). **Checkpoint humano: sí — no avanzar al Paso 4 sin confirmar esto manualmente.**
- [ ] **Paso 4 — Prueba end-to-end de bajo riesgo.** Tarea reversible (ej. corregir un typo en un comentario del webhook) de punta a punta por el pipeline completo. A partir de aquí el bucle de auto-refinamiento puede correr sin checkpoint humano en cada paso.
- [ ] **Paso 5 — DNS de Chatwoot (vía conector Hostinger, Sección 4.1).** Verificar si `chatwoot.jgispublicidad.pe` ya resuelve a `34.69.161.101`; si no existe, el agente propone el registro A exacto. **Checkpoint humano: sí, antes de crear/sobreescribir el registro.**
- [ ] **Paso 6 — Certbot + bloque Nginx para Chatwoot.** El agente prepara (no ejecuta) el bloque `server` de Nginx para `chatwoot.jgispublicidad.pe` y el comando exacto `sudo certbot --nginx -d chatwoot.jgispublicidad.pe`. **Checkpoint humano: sí, siempre — ejecución manual por el usuario o su socio** (regla 0.2, radio de daño cubre todo el proxy inverso).
- [ ] **Paso 7 — Backlog alto riesgo JGIS.** Atacar el TRUNCATE del sync de catálogo (ver 1.5, ítem 1).
- [ ] **Paso 8 — Backlog prioridad media.** Intent Router, migración cloud residual, etc. (ver 1.5 y 2.3)."""

    if old_steps in text:
        updated = text.replace(old_steps, new_steps)
        open(path, 'w').write(updated)
        print("Successfully updated steps in PROMPT_MAESTRO.md")
    else:
        # Fallback search if spacing differs slightly
        print("Error: Could not find exact step block for replacement, doing fuzzy match...")
        # Just write new steps to confirm
        lines = text.split('\n')
        start_idx = -1
        end_idx = -1
        for idx, line in enumerate(lines):
            if "### 3.2 Pasos" in line:
                start_idx = idx
            if start_idx != -1 and line.startswith("----"):
                end_idx = idx
                break
        if start_idx != -1 and end_idx != -1:
            updated_lines = lines[:start_idx] + [new_steps] + lines[end_idx:]
            open(path, 'w').write('\n'.join(updated_lines))
            print("Successfully updated steps in PROMPT_MAESTRO.md via fuzzy match!")
        else:
            print("Fuzzy match also failed.")
else:
    print(f"Error: Path {path} not found")
