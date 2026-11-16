-- Preserve existing code values while naming primary keys after their entities.
ALTER TABLE vinlook.users RENAME COLUMN id TO user_id;
ALTER TABLE vinlook.pois RENAME COLUMN id TO poi_id;
ALTER TABLE vinlook.poi_translations RENAME COLUMN id TO poi_translation_id;
ALTER TABLE vinlook.poi_narrations RENAME COLUMN id TO poi_narration_id;

ALTER TABLE vinlook.poi_translations
  DROP CONSTRAINT poi_translations_pkey,
  DROP CONSTRAINT poi_translations_id_key,
  ADD PRIMARY KEY(poi_translation_id),
  ADD UNIQUE(poi_id, language_code),
  ADD FOREIGN KEY(poi_id) REFERENCES vinlook.pois(poi_id);

ALTER TABLE vinlook.poi_narrations
  DROP CONSTRAINT poi_narrations_pkey,
  DROP CONSTRAINT poi_narrations_id_key,
  ADD PRIMARY KEY(poi_narration_id),
  ADD UNIQUE(poi_id, language_code),
  ADD FOREIGN KEY(poi_id) REFERENCES vinlook.pois(poi_id);

CREATE SEQUENCE vinlook.poi_images_id_seq;

ALTER TABLE vinlook.poi_images
  ADD COLUMN poi_image_id varchar(36) COLLATE vinlook.case_insensitive NOT NULL
    DEFAULT vinlook.next_code('IMG', 'vinlook.poi_images_id_seq'),
  ADD COLUMN image_url text,
  ADD COLUMN image_credit varchar(300),
  ADD COLUMN image_source_url text,
  ADD COLUMN image_license_url text,
  ALTER COLUMN content DROP NOT NULL,
  ALTER COLUMN content_type DROP NOT NULL,
  ALTER COLUMN sha256 DROP NOT NULL,
  ADD CONSTRAINT poi_images_binary_fields CHECK (
    (content IS NULL AND content_type IS NULL AND sha256 IS NULL)
    OR (content IS NOT NULL AND content_type IS NOT NULL AND sha256 IS NOT NULL)
  );

ALTER SEQUENCE vinlook.poi_images_id_seq OWNED BY vinlook.poi_images.poi_image_id;

-- Migrate photo metadata without changing bytes, checksums or timestamps.
UPDATE vinlook.poi_images AS i
SET image_url = p.image_url, image_credit = p.image_credit,
    image_source_url = p.image_source_url, image_license_url = p.image_license_url
FROM vinlook.pois AS p
WHERE p.poi_id = i.poi_id;

INSERT INTO vinlook.poi_images(poi_id, image_url, image_credit, image_source_url, image_license_url, updated_at)
SELECT p.poi_id, p.image_url, p.image_credit, p.image_source_url, p.image_license_url, p.updated_at
FROM vinlook.pois AS p
WHERE NOT EXISTS (SELECT 1 FROM vinlook.poi_images AS i WHERE i.poi_id = p.poi_id)
  AND COALESCE(p.image_url, p.image_credit, p.image_source_url, p.image_license_url) IS NOT NULL;

ALTER TABLE vinlook.poi_images
  DROP CONSTRAINT poi_images_pkey,
  ADD PRIMARY KEY(poi_image_id);

CREATE INDEX poi_images_poi ON vinlook.poi_images(poi_id);

-- The existing API shows one representative image. Preserve the original image
-- when additional images are added, and prefer an actual image over credit alone.
CREATE OR REPLACE VIEW vinlook_runtime.poi_photos WITH (security_invoker = true) AS
SELECT p.id AS poi_id, i.image_url, i.image_credit, i.image_source_url,
       i.image_license_url, i.content, i.content_type, i.sha256, i.poi_image_id
FROM vinlook_runtime.pois p
LEFT JOIN LATERAL (
  SELECT candidate.*
  FROM vinlook.poi_images candidate
  WHERE candidate.poi_id = p.id
  ORDER BY (candidate.content IS NOT NULL OR candidate.image_url IS NOT NULL) DESC,
           length(candidate.poi_image_id), candidate.poi_image_id COLLATE "C"
  LIMIT 1
) i ON true;

CREATE OR REPLACE FUNCTION vinlook_runtime.save_poi_cover(
  target_id varchar, new_credit varchar, new_source text, new_license text,
  supplied_content bytea, supplied_type varchar, supplied_hash text
) RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, vinlook
AS $$
DECLARE
  cover_id varchar(36);
  uploaded_url text;
BEGIN
  -- The admin repository also updates the POI in the same transaction.
  PERFORM 1 FROM vinlook.pois WHERE poi_id = target_id FOR UPDATE;
  SELECT poi_image_id INTO cover_id FROM vinlook_runtime.poi_photos WHERE poi_id = target_id;
  IF supplied_content IS NOT NULL THEN
    uploaded_url := '/api/pois/' || target_id || '/image';
  END IF;

  IF cover_id IS NOT NULL THEN
    UPDATE vinlook.poi_images
    SET image_credit = new_credit, image_source_url = new_source, image_license_url = new_license,
        image_url = COALESCE(uploaded_url, image_url), content = COALESCE(supplied_content, content),
        content_type = COALESCE(supplied_type, content_type), sha256 = COALESCE(supplied_hash, sha256),
        updated_at = now()
    WHERE poi_image_id = cover_id;
  ELSIF supplied_content IS NOT NULL OR COALESCE(new_credit, new_source, new_license) IS NOT NULL THEN
    INSERT INTO vinlook.poi_images(poi_id, image_url, image_credit, image_source_url, image_license_url, content, content_type, sha256)
    VALUES(target_id, uploaded_url, new_credit, new_source, new_license, supplied_content, supplied_type, supplied_hash);
  END IF;
END;
$$;

ALTER TABLE vinlook.pois
  DROP COLUMN image_url,
  DROP COLUMN image_credit,
  DROP COLUMN image_source_url,
  DROP COLUMN image_license_url;
