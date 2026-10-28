ALTER TABLE dbo.Pois ADD VisitorDescription NVARCHAR(3000) NOT NULL CONSTRAINT DF_Pois_VisitorDescription DEFAULT N'';
