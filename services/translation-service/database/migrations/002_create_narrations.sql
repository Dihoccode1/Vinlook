CREATE TABLE dbo.poi_narrations (
  poi_id UNIQUEIDENTIFIER NOT NULL,
  language_code VARCHAR(10) NOT NULL,
  content_hash CHAR(64) NOT NULL,
  audio VARBINARY(MAX) NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_PoiNarrations PRIMARY KEY (poi_id, language_code),
  CONSTRAINT CK_PoiNarrations_AudioSize CHECK (DATALENGTH(audio) BETWEEN 44 AND 21000000)
);
