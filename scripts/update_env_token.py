import os

path = '/home/jgis/ai-agents/.env'
if os.path.exists(path):
    text = open(path).read()
    # Replace Telegram token placeholder with the real token provided by the user
    updated = text.replace('TELEGRAM_BOT_TOKEN=tu_telegram_bot_token_aqui', 'TELEGRAM_BOT_TOKEN=8979226802:AAEHZD5e2EPceZRsZIAUyJfAVAoQkU97J9Q')
    open(path, 'w').write(updated)
    print("Successfully updated TELEGRAM_BOT_TOKEN in .env")
else:
    print(f"Error: Path {path} not found")
