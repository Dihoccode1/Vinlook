CREATE TABLE dbo.users (
  id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Users PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
  username NVARCHAR(100) NOT NULL CONSTRAINT UQ_Users_Username UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  full_name NVARCHAR(200) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin' CONSTRAINT CK_Users_Role CHECK (role IN ('admin','editor')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CONSTRAINT CK_Users_Status CHECK (status IN ('active','disabled')),
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE dbo.admin_sessions (
  token_hash CHAR(64) NOT NULL CONSTRAINT PK_AdminSessions PRIMARY KEY,
  user_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_AdminSessions_Users REFERENCES dbo.users(id),
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  expires_at DATETIME2 NOT NULL,
  revoked_at DATETIME2 NULL
);
CREATE INDEX IX_AdminSessions_User ON dbo.admin_sessions(user_id, expires_at);
ALTER TABLE dbo.pois ADD created_by UNIQUEIDENTIFIER NULL CONSTRAINT FK_Pois_CreatedBy REFERENCES dbo.users(id),
  updated_by UNIQUEIDENTIFIER NULL CONSTRAINT FK_Pois_UpdatedBy REFERENCES dbo.users(id);

CREATE TABLE dbo.visit_sessions (
  id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_VisitSessions PRIMARY KEY,
  started_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  last_seen_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  ended_at DATETIME2 NULL,
  preferred_language VARCHAR(10) NULL
);
CREATE TABLE dbo.Routes (
  id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Routes PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
  session_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_Routes_Sessions REFERENCES dbo.visit_sessions(id),
  name NVARCHAR(200) NOT NULL,
  Vehicle VARCHAR(20) NOT NULL CONSTRAINT CK_Routes_Vehicle CHECK (Vehicle IN ('driving','motorcycle','walking')),
  OriginLatitude FLOAT NOT NULL CONSTRAINT CK_Routes_Lat CHECK (OriginLatitude BETWEEN -90 AND 90),
  OriginLongitude FLOAT NOT NULL CONSTRAINT CK_Routes_Lon CHECK (OriginLongitude BETWEEN -180 AND 180),
  DistanceMeters FLOAT NULL CONSTRAINT CK_Routes_Distance CHECK (DistanceMeters >= 0),
  duration_seconds FLOAT NULL CONSTRAINT CK_Routes_Duration CHECK (duration_seconds >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'planned' CONSTRAINT CK_Routes_Status CHECK (status IN ('planned','active','completed','cancelled')),
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE dbo.RouteStops (
  RouteId UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_RouteStops_Routes REFERENCES dbo.Routes(id) ON DELETE CASCADE,
  StopOrder INT NOT NULL CONSTRAINT CK_RouteStops_Order CHECK (StopOrder >= 1),
  poi_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_RouteStops_Pois REFERENCES dbo.pois(id),
  CONSTRAINT PK_RouteStops PRIMARY KEY(RouteId, StopOrder)
);
CREATE INDEX IX_RouteStops_Poi ON dbo.RouteStops(poi_id);
CREATE TABLE dbo.usage_events (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_UsageEvents PRIMARY KEY,
  session_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_UsageEvents_Sessions REFERENCES dbo.visit_sessions(id),
  poi_id UNIQUEIDENTIFIER NULL CONSTRAINT FK_UsageEvents_Pois REFERENCES dbo.pois(id),
  event_type VARCHAR(30) NOT NULL CONSTRAINT CK_UsageEvents_Type CHECK (event_type IN ('poi_view','audio_start','audio_pause','audio_end','route_created')),
  language_code VARCHAR(10) NULL,
  occurred_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_UsageEvents_Time ON dbo.usage_events(occurred_at, event_type);
CREATE TABLE dbo.system_logs (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SystemLogs PRIMARY KEY,
  user_id UNIQUEIDENTIFIER NULL CONSTRAINT FK_SystemLogs_Users REFERENCES dbo.users(id),
  poi_id UNIQUEIDENTIFIER NULL CONSTRAINT FK_SystemLogs_Pois REFERENCES dbo.pois(id),
  component NVARCHAR(100) NOT NULL,
  level VARCHAR(10) NOT NULL CONSTRAINT CK_SystemLogs_Level CHECK (level IN ('info','warning','error')),
  action VARCHAR(50) NULL,
  message NVARCHAR(2000) NOT NULL,
  occurred_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_SystemLogs_Time ON dbo.system_logs(occurred_at, level);
