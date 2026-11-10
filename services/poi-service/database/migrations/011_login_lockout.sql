ALTER TABLE dbo.users ADD
  failed_login_count INT NOT NULL CONSTRAINT df_users_failed_login_count DEFAULT 0,
  login_retry_at DATETIME2 NULL,
  login_locked BIT NOT NULL CONSTRAINT df_users_login_locked DEFAULT 0;
EXEC(N'ALTER TABLE dbo.users ADD CONSTRAINT ck_users_failed_login_count CHECK(failed_login_count BETWEEN 0 AND 15)');
