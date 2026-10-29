ALTER TABLE dbo.pois ADD visitor_description NVARCHAR(3000) NOT NULL CONSTRAINT DF_Pois_VisitorDescription DEFAULT N'';
