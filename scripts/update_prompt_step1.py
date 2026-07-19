import os

path = '/home/jgis/whatsapp-bot/.agents/PROMPT_MAESTRO.md'
if os.path.exists(path):
    text = open(path).read()
    
    old_line = "- [ ] **Paso 1 — Telegram → OpenClaw.** Confirmar `TELEGRAM_BOT_TOKEN` real en `/home/jgis/ai-agents/.env`, reiniciar OpenClaw, enviar mensaje de prueba y confirmar en logs (`sudo docker logs jgis-openclaw -f`) que llega. **Checkpoint humano: sí** (primer eslabón, valida a mano)."
    new_line = "- [x] **Paso 1 — Telegram → OpenClaw.** Confirmar `TELEGRAM_BOT_TOKEN` real en `/home/jgis/ai-agents/.env`, reiniciar OpenClaw, enviar mensaje de prueba y confirmar en logs (`sudo docker logs jgis-openclaw -f`) que llega. (Completado: 18-Jul-2026, Bot conectado con éxito como @OrJgisBot en logs)."
    
    if old_line in text:
        updated = text.replace(old_line, new_line)
        open(path, 'w').write(updated)
        print("Successfully marked Paso 1 as completed in PROMPT_MAESTRO.md")
    else:
        print("Error: Could not find exact Paso 1 line, doing fallback replace...")
        lines = text.split('\n')
        for idx, line in enumerate(lines):
            if "Paso 1 — Telegram" in line:
                lines[idx] = new_line
                open(path, 'w').write('\n'.join(lines))
                print("Successfully updated Paso 1 line via fallback!")
                break
else:
    print(f"Error: Path {path} not found")
