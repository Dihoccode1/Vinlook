-- Check the retired data while holding exclusive locks until this migration commits.
LOCK TABLE vinlook.usage_events, vinlook.visit_sessions, vinlook.poi_narrations
  IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vinlook.usage_events) THEN
    RAISE EXCEPTION 'Cannot remove retired table: vinlook.usage_events contains data';
  END IF;

  IF EXISTS (SELECT 1 FROM vinlook.visit_sessions) THEN
    RAISE EXCEPTION 'Cannot remove retired table: vinlook.visit_sessions contains data';
  END IF;

  IF EXISTS (
    SELECT 1 FROM vinlook.poi_narrations
    WHERE file_path IS NOT NULL OR duration_seconds IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot remove retired narration columns: retired narration columns contain data';
  END IF;
END
$$;

DROP TABLE vinlook.usage_events;
DROP TABLE vinlook.visit_sessions;
ALTER TABLE vinlook.poi_narrations
  DROP COLUMN file_path,
  DROP COLUMN duration_seconds;
