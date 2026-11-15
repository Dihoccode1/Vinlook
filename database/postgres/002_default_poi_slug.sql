ALTER TABLE vinlook.pois
  ALTER COLUMN slug SET DEFAULT ('poi-' || gen_random_uuid()::text);
