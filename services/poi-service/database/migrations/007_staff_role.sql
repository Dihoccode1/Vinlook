ALTER TABLE dbo.users DROP CONSTRAINT CK_Users_Role;
UPDATE dbo.users SET role='staff' WHERE role='editor';
ALTER TABLE dbo.users ADD CONSTRAINT CK_Users_Role CHECK (role IN ('admin','staff'));
