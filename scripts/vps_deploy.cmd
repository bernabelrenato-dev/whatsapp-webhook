@echo off
gcloud compute ssh jgis-chatbot-server --zone=us-central1-a --command "docker logs --tail 30 jgis-webhook"
