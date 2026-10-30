-- Keep composite keys used by existing caches; add independent ERD identifiers.
ALTER TABLE dbo.poi_translations ADD id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_PoiTranslations_Id DEFAULT NEWSEQUENTIALID(),
  status VARCHAR(20) NOT NULL CONSTRAINT DF_PoiTranslations_Status DEFAULT 'ready',
  CONSTRAINT UQ_PoiTranslations_Id UNIQUE(id),
  CONSTRAINT CK_PoiTranslations_Status CHECK (status IN ('ready','draft','failed'));
ALTER TABLE dbo.poi_narrations ADD id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_PoiNarrations_Id DEFAULT NEWSEQUENTIALID(),
  file_path NVARCHAR(1000) NULL,
  duration_seconds FLOAT NULL,
  status VARCHAR(20) NOT NULL CONSTRAINT DF_PoiNarrations_Status DEFAULT 'ready',
  CONSTRAINT UQ_PoiNarrations_Id UNIQUE(id),
  CONSTRAINT CK_PoiNarrations_Duration CHECK (duration_seconds >= 0),
  CONSTRAINT CK_PoiNarrations_Status CHECK (status IN ('ready','draft','failed'));
