@echo off
gcloud compute ssh jgis-chatbot-server --zone=us-central1-a --command "sudo chown -R jgis:jgis /home/jgis/whatsapp-bot; cd /home/jgis/whatsapp-bot; git fetch origin master; git reset --hard origin/master; docker compose up -d --build webhook; sleep 3; docker exec -i jgis-webhook node scripts/inspect_chatwoot_remote.js"
