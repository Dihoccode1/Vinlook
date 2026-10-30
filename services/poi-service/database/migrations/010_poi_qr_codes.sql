CREATE TABLE dbo.poi_qr_codes (
    poi_id UNIQUEIDENTIFIER NOT NULL,
    qr_token VARCHAR(128) COLLATE Latin1_General_100_BIN2 NOT NULL,
    qr_image_url NVARCHAR(2048) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT df_poi_qr_codes_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL CONSTRAINT df_poi_qr_codes_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_poi_qr_codes PRIMARY KEY (poi_id),
    CONSTRAINT fk_poi_qr_codes_poi FOREIGN KEY (poi_id) REFERENCES dbo.pois(id),
    CONSTRAINT uq_poi_qr_codes_qr_token UNIQUE (qr_token),
    CONSTRAINT ck_poi_qr_codes_qr_token CHECK (LEN(LTRIM(RTRIM(qr_token))) > 0)
);

-- Keep the modification time current even for direct SQL updates.
EXEC(N'CREATE TRIGGER dbo.tr_poi_qr_codes_updated_at
ON dbo.poi_qr_codes AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL(OBJECT_ID(N''dbo.tr_poi_qr_codes_updated_at'')) > 1 RETURN;
    UPDATE qr SET updated_at = SYSUTCDATETIME()
    FROM dbo.poi_qr_codes qr INNER JOIN inserted i ON i.poi_id = qr.poi_id;
END');
