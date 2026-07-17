
-- Delete existing test bot if any
DELETE FROM "PublicTypebot" WHERE "typebotId" = 'test-bot-12345';
DELETE FROM "Typebot" WHERE "id" = 'test-bot-12345';

-- Insert into Typebot (development)
INSERT INTO "Typebot" (
  "id", "createdAt", "updatedAt", "name", "groups", "variables", "edges", "theme", "settings", 
  "publicId", "workspaceId", "isArchived", "isClosed", "version", "events"
) VALUES (
  'test-bot-12345', NOW(), NOW(), 'Test Bot', '[{"id":"group-1","title":"Group #1","blocks":[{"id":"text-block-1","type":"text","content":{"richText":[{"type":"p","children":[{"text":"Hola, esta es una prueba."}]}]}}],"graphCoordinates":{"x":200,"y":100}}]'::jsonb, '[]'::jsonb, '[{"id":"edge-1","from":{"eventId":"start-event-1"},"to":{"groupId":"group-1"}}]'::jsonb, '{}'::jsonb, '{}'::jsonb,
  'test-bot-12345', 'cmrmhukft00002lnhgzcmtgft', false, false, '6.1', '[{"id":"start-event-1","type":"start","graphCoordinates":{"x":0,"y":100}}]'::jsonb
);

-- Insert into PublicTypebot (published)
INSERT INTO "PublicTypebot" (
  "id", "typebotId", "createdAt", "updatedAt", "groups", "variables", "edges", "theme", "settings",
  "events", "version"
) VALUES (
  'public-test-bot-12345', 'test-bot-12345', NOW(), NOW(), '[{"id":"group-1","title":"Group #1","blocks":[{"id":"text-block-1","type":"text","content":{"richText":[{"type":"p","children":[{"text":"Hola, esta es una prueba."}]}]}}],"graphCoordinates":{"x":200,"y":100}}]'::jsonb, '[]'::jsonb, '[{"id":"edge-1","from":{"eventId":"start-event-1"},"to":{"groupId":"group-1"}}]'::jsonb, '{}'::jsonb, '{}'::jsonb,
  '[{"id":"start-event-1","type":"start","graphCoordinates":{"x":0,"y":100}}]'::jsonb, '6.1'
);
