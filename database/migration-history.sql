-- Preserve the legacy migration history in database metadata, without a user table.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @result INT;
EXEC @result = sys.sp_getapplock @Resource=N'vinlook-schema-migrations', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000;
IF @result < 0 THROW 51000, 'Migration lock unavailable', 1;
IF OBJECT_ID(N'dbo.SchemaMigrations',N'U') IS NOT NULL
BEGIN
  EXEC sys.sp_executesql N'
    DECLARE @file NVARCHAR(255), @applied DATETIME2, @property NVARCHAR(128), @stamp NVARCHAR(40);
    DECLARE history_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT Name,AppliedAt FROM dbo.SchemaMigrations;
    OPEN history_cursor;
    FETCH NEXT FROM history_cursor INTO @file,@applied;
    WHILE @@FETCH_STATUS=0
    BEGIN
      IF LEN(@file)>110 THROW 51000, ''Migration filename too long'', 1;
      SET @property=N''Vinlook.Migration.''+@file;
      SET @stamp=CONVERT(NVARCHAR(40),@applied,126);
      IF NOT EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=@property)
        EXEC sys.sp_addextendedproperty @name=@property,@value=@stamp;
      FETCH NEXT FROM history_cursor INTO @file,@applied;
    END;
    CLOSE history_cursor;
    DEALLOCATE history_cursor;
    DROP TABLE dbo.SchemaMigrations;';
END;
COMMIT TRANSACTION;
