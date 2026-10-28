-- Keep composite keys used by existing caches; add independent ERD identifiers.
ALTER TABLE dbo.PoiTranslations ADD Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_PoiTranslations_Id DEFAULT NEWSEQUENTIALID(),
  Status VARCHAR(20) NOT NULL CONSTRAINT DF_PoiTranslations_Status DEFAULT 'ready',
  CONSTRAINT UQ_PoiTranslations_Id UNIQUE(Id),
  CONSTRAINT CK_PoiTranslations_Status CHECK (Status IN ('ready','draft','failed'));
ALTER TABLE dbo.PoiNarrations ADD Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_PoiNarrations_Id DEFAULT NEWSEQUENTIALID(),
  FilePath NVARCHAR(1000) NULL,
  DurationSeconds FLOAT NULL,
  Status VARCHAR(20) NOT NULL CONSTRAINT DF_PoiNarrations_Status DEFAULT 'ready',
  CONSTRAINT UQ_PoiNarrations_Id UNIQUE(Id),
  CONSTRAINT CK_PoiNarrations_Duration CHECK (DurationSeconds >= 0),
  CONSTRAINT CK_PoiNarrations_Status CHECK (Status IN ('ready','draft','failed'));
