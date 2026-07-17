
UPDATE "Typebot" SET "events" = '[{"id":"start-event-1","type":"start","outgoingEdgeId":"edge-1","graphCoordinates":{"x":0,"y":100}}]'::jsonb WHERE "id" = 'test-bot-12345';
UPDATE "PublicTypebot" SET "events" = '[{"id":"start-event-1","type":"start","outgoingEdgeId":"edge-1","graphCoordinates":{"x":0,"y":100}}]'::jsonb WHERE "typebotId" = 'test-bot-12345';
