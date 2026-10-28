import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sql from 'mssql';
import { getPool, closePool } from '../../src/config/database.js';

test('ERD enforces users, visitor sessions, ordered route stops, events and logs', async () => {
  const pool = await getPool(); const tx = new sql.Transaction(pool); await tx.begin();
  const user = randomUUID(), session = randomUUID(), route = randomUUID(), poi = randomUUID();
  const request = () => new sql.Request(tx).input('user', sql.UniqueIdentifier, user).input('session', sql.UniqueIdentifier, session)
    .input('route', sql.UniqueIdentifier, route).input('poi', sql.UniqueIdentifier, poi);
  try {
    await request().input('username', sql.NVarChar(100), `erd-${user}`).query(`
      INSERT INTO dbo.Users(Id,Username,PasswordHash,FullName) VALUES(@user,@username,'test-hash',N'ERD test');
      INSERT INTO dbo.VisitSessions(Id) VALUES(@session);
      INSERT INTO dbo.Pois(Id,Slug,Name,Description,Address,Latitude,Longitude,Category,CreatedBy) VALUES(@poi,CONVERT(VARCHAR(36),@poi),N'Test',N'Audio',N'Address',10,106,'history',@user);
      INSERT INTO dbo.Routes(Id,SessionId,Name,Vehicle,OriginLatitude,OriginLongitude) VALUES(@route,@session,N'Test route','walking',10,106);
      INSERT INTO dbo.RouteStops(RouteId,StopOrder,PoiId) VALUES(@route,1,@poi),(@route,2,@poi);
      INSERT INTO dbo.UsageEvents(SessionId,PoiId,EventType,LanguageCode) VALUES(@session,@poi,'audio_start','vi');
      INSERT INTO dbo.SystemLogs(UserId,PoiId,Component,Level,Message) VALUES(@user,@poi,N'test','info',N'ERD test');
      INSERT INTO dbo.SystemLogs(Component,Level,Message) VALUES(N'test','error',N'System event without user');`);
    const result = await request().query('SELECT StopOrder AS position FROM dbo.RouteStops WHERE RouteId=@route ORDER BY StopOrder');
    assert.deepEqual(result.recordset.map(row => row.position), [1, 2]);
    await assert.rejects(request().query('INSERT INTO dbo.RouteStops(RouteId,StopOrder,PoiId) VALUES(@route,1,@poi)'));
    await assert.rejects(request().query('INSERT INTO dbo.RouteStops(RouteId,StopOrder,PoiId) VALUES(@route,0,@poi)'));
    await assert.rejects(request().query("INSERT INTO dbo.UsageEvents(SessionId,EventType) VALUES(NEWID(),'audio_start')"));
    await assert.rejects(request().query("UPDATE dbo.Routes SET Vehicle='bus' WHERE Id=@route"));
  } finally { await tx.rollback(); await closePool(); }
});
