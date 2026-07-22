@echo off
gcloud compute ssh jgis-chatbot-server --zone=us-central1-a --command "cd /home/jgis/whatsapp-bot; git fetch origin master; git reset --hard origin/master; git clean -fd; docker compose up -d --build webhook"
