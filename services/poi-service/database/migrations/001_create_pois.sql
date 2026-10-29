CREATE TABLE dbo.pois (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Pois PRIMARY KEY,
    slug NVARCHAR(160) NOT NULL CONSTRAINT UQ_Pois_Slug UNIQUE,
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    address NVARCHAR(500) NOT NULL,
    latitude FLOAT NOT NULL CONSTRAINT CK_Pois_Latitude CHECK (latitude BETWEEN -90 AND 90),
    longitude FLOAT NOT NULL CONSTRAINT CK_Pois_Longitude CHECK (longitude BETWEEN -180 AND 180),
    category NVARCHAR(50) NOT NULL,
    source_language VARCHAR(10) NOT NULL CONSTRAINT DF_Pois_Language DEFAULT 'vi',
    is_published BIT NOT NULL CONSTRAINT DF_Pois_Published DEFAULT 0,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_Pois_Created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_Pois_Updated DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Pois_Published_Category ON dbo.pois (is_published, category);
