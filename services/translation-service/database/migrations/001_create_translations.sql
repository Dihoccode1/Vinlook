CREATE TABLE dbo.poi_translations (
    poi_id UNIQUEIDENTIFIER NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    source_hash CHAR(64) NOT NULL,
    name NVARCHAR(2000) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    provider NVARCHAR(50) NOT NULL,
    translated_at DATETIME2 NOT NULL,
    CONSTRAINT PK_PoiTranslations PRIMARY KEY (poi_id, language_code)
);
