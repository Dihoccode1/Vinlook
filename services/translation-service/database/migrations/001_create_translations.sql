CREATE TABLE dbo.PoiTranslations (
    PoiId UNIQUEIDENTIFIER NOT NULL,
    LanguageCode VARCHAR(10) NOT NULL,
    SourceLanguage VARCHAR(10) NOT NULL,
    SourceHash CHAR(64) NOT NULL,
    Name NVARCHAR(2000) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    Provider NVARCHAR(50) NOT NULL,
    TranslatedAt DATETIME2 NOT NULL,
    CONSTRAINT PK_PoiTranslations PRIMARY KEY (PoiId, LanguageCode)
);
