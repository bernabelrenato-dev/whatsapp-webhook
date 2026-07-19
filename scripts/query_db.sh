#!/bin/bash
sudo docker exec -i jgis-postgres psql -U postgres -d chatwoot_production -c "SELECT email, confirmed_at, confirmation_token FROM users WHERE confirmed_at IS NULL;"
