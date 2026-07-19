import os

path = '/home/jgis/whatsapp-bot/.agents/PROMPT_MAESTRO.md'
if os.path.exists(path):
    text = open(path).read()
    
    old_line = "- [ ] **Paso 2 — OpenClaw → Dify.** Crear en Dify una App tipo Agente con acceso a la herramienta MCP de OpenCode. Apuntar OpenClaw a esa App vía su API key. **Checkpoint humano: sí** (requiere que definas el flujo en Dify, aún en curva de aprendizaje)."
    new_line = "- [x] **Paso 2 — OpenClaw → Dify.** Crear en Dify una App tipo Agente con acceso a la herramienta MCP de OpenCode. Apuntar OpenClaw a esa App vía su API key. (Completado: 18-Jul-2026, Dify API key del Agente configurada y OpenClaw enlazado con éxito)."
    
    if old_line in text:
        updated = text.replace(old_line, new_line)
        open(path, 'w').write(updated)
        print("Successfully marked Paso 2 as completed in PROMPT_MAESTRO.md")
    else:
        print("Error: Could not find exact Paso 2 line, doing fallback replace...")
        lines = text.split('\n')
        for idx, line in enumerate(lines):
            if "Paso 2 — OpenClaw" in line:
                lines[idx] = new_line
                open(path, 'w').write('\n'.join(lines))
                print("Successfully updated Paso 2 line via fallback!")
                break
else:
    print(f"Error: Path {path} not found")
