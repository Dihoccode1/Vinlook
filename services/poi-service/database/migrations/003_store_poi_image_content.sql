CREATE TABLE dbo.poi_images (
    poi_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_PoiImages PRIMARY KEY,
    content VARBINARY(MAX) NOT NULL,
    content_type VARCHAR(30) NOT NULL,
    sha256 CHAR(64) NOT NULL,
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_PoiImages_Updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_PoiImages_Pois FOREIGN KEY (poi_id) REFERENCES dbo.pois(id) ON DELETE CASCADE,
    CONSTRAINT CK_PoiImages_Size CHECK (DATALENGTH(content) BETWEEN 1 AND 5242880),
    CONSTRAINT CK_PoiImages_ContentType CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp'))
);
