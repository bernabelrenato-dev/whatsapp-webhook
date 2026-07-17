-- Parche de base de datos V6: Corrección y eliminación de conexión duplicada con typo
UPDATE "Typebot"
SET "edges" = '[
  {"id":"zw08tj9wol0q2q3i4372hv4r","from":{"eventId":"v0t2t6oopuj23vdb6tpowo5u"},"to":{"groupId":"exao9trxde9luucdfikqaszb"}},
  {"id":"edge-results-to-cond","from":{"blockId":"wb7k4o8xroumbd8kpg4qkbq6"},"to":{"groupId":"nmotxvmc5wj9ptwsabshvosr","blockId":"block-cond-action"}},
  {"id":"edge-cond-handover","from":{"blockId":"block-cond-action","itemId":"block-cond-action-item-handover"},"to":{"groupId":"ygzfwe3aqdfwfl2b02j3uwah"}},
  {"id":"edge-cond-retry-qty","from":{"blockId":"block-cond-action","itemId":"block-cond-action-item-retry"},"to":{"groupId":"ygzfwe3aqdfwfl2b02j3uwao","blockId":"evajo7t6310betxzo9026i7b"}},
  {"id":"edge-cond-default","from":{"blockId":"block-cond-action"},"to":{"groupId":"nmotxvmc5wj9ptwsabshvosr","blockId":"w9o4wpkclgn320jnwtztfp7i"}},
  {"id":"qhd1wz9km1hc2zdy3che0cvx","from":{"blockId":"y3yykv4gdbpas96vgy2sn1iy"},"to":{"groupId":"nmotxvmc5wj9ptwsabshvosr"}},
  {"id":"edge-image-to-loopmenu","from":{"blockId":"idozms8tk47u0trg090qzrf4"},"to":{"groupId":"ygzfwe3aqdfwfl2b02j3uwac"}},
  {"id":"edge-loopmenu-cotizar","from":{"blockId":"block-choice-loopmenu","itemId":"block-choice-loopmenu-item-cotizar"},"to":{"groupId":"ygzfwe3aqdfwfl2b02j3uwao","blockId":"f0a8eeuks52daqxevw4c0wqo"}},
  {"id":"edge-loopmenu-asesor","from":{"blockId":"block-choice-loopmenu","itemId":"block-choice-loopmenu-item-asesor"},"to":{"groupId":"ygzfwe3aqdfwfl2b02j3uwah"}},
  {"id":"edge-loopmenu-terminar","from":{"blockId":"block-choice-loopmenu","itemId":"block-choice-loopmenu-item-terminar"},"to":{"groupId":"ygzfwe3aqdfwfl2b02j3uwad"}},
  {"id":"edge-welcome-to-select","from":{"blockId":"lowpae24szrntg6o49hctatt"},"to":{"groupId":"ygzfwe3aqdfwfl2b02j3uwao"}}
]'::jsonb
WHERE "id" = 'o6jypntclntjiubkcf33vo50';

-- Sincronizar en la tabla PublicTypebot
UPDATE "PublicTypebot"
SET "edges" = (SELECT "edges" FROM "Typebot" WHERE "id" = 'o6jypntclntjiubkcf33vo50')
WHERE "typebotId" = 'o6jypntclntjiubkcf33vo50';
