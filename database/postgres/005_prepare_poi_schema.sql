-- Keep the backend contract stable while the tables in vinlook are reorganized.
CREATE SCHEMA vinlook_runtime;
REVOKE ALL ON SCHEMA vinlook_runtime FROM PUBLIC;

CREATE VIEW vinlook_runtime.users WITH (security_invoker = true) AS
SELECT id, username, password_hash, full_name, role, status, created_at,
       failed_login_count, login_retry_at, login_locked
FROM vinlook.users;

CREATE VIEW vinlook_runtime.pois WITH (security_invoker = true) AS
SELECT id, name, description, visitor_description, address, latitude, longitude,
       category, source_language, is_published, created_at, updated_at, created_by, updated_by
FROM vinlook.pois;

CREATE VIEW vinlook_runtime.poi_photos WITH (security_invoker = true) AS
SELECT p.id AS poi_id, p.image_url, p.image_credit, p.image_source_url,
       p.image_license_url, i.content, i.content_type, i.sha256
FROM vinlook.pois p
LEFT JOIN vinlook.poi_images i ON i.poi_id = p.id;

CREATE FUNCTION vinlook_runtime.save_poi_cover(
  target_id varchar, new_credit varchar, new_source text, new_license text,
  supplied_content bytea, supplied_type varchar, supplied_hash text
) RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, vinlook
AS $$
BEGIN
  UPDATE vinlook.pois
  SET image_credit = new_credit, image_source_url = new_source, image_license_url = new_license,
      image_url = CASE WHEN supplied_content IS NULL THEN image_url ELSE '/api/pois/' || id || '/image' END
  WHERE id = target_id;

  IF supplied_content IS NOT NULL THEN
    INSERT INTO vinlook.poi_images(poi_id, content, content_type, sha256)
    VALUES(target_id, supplied_content, supplied_type, supplied_hash)
    ON CONFLICT(poi_id) DO UPDATE
    SET content = EXCLUDED.content, content_type = EXCLUDED.content_type,
        sha256 = EXCLUDED.sha256, updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION vinlook_runtime.save_poi_cover(varchar, varchar, text, text, bytea, varchar, text) FROM PUBLIC;
