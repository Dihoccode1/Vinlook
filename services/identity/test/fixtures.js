import { Types } from 'mongoose';

// Non-authenticating synthetic bcrypt-shaped string, not a real password credential.
const fakeHash = '$2b$12$' + 'A'.repeat(53);
const id = () => new Types.ObjectId();
const at = () => new Date('2026-10-23T03:00:00.000Z');

export const fixtures = {
  account: () => ({ fullName: 'Synthetic Staff', email: 'fixture@example.invalid', passwordHash: fakeHash,
    role: 'Staff', status: 'pending', authVersion: 0 }),
  workSession: () => ({ staffId: id(), workDateVN: '2026-10-23', status: 'open', openedAt: at(), closedAt: null }),
  audit: () => ({ eventId: 'synthetic-event', actorType: 'account', actorId: id(), operatorId: null,
    workSessionId: id(), action: 'fixture_operation', poiId: null, occurredAt: at(), receivedAt: at(),
    result: { status: 'succeeded', errorCode: null } }),
  operatorAudit: () => ({ eventId: 'synthetic-operator-event', actorType: 'operator', actorId: null,
    operatorId: 'synthetic-operator', workSessionId: null, action: 'fixture_operator_operation',
    targetAccountId: id(), reason: 'Synthetic recovery test', occurredAt: at(), receivedAt: at(),
    result: { status: 'succeeded', errorCode: null } }),
  recovery: () => ({ staffId: id(), codeHash: 'a'.repeat(64), expiresAt: new Date('2026-10-23T03:15:00.000Z'),
    usedAt: null, issuedBy: id(), issuedByOperator: null }),
  rate: () => ({ key: 'b'.repeat(64), windowStart: new Date(), count: 1, expiresAt: new Date(Date.now() + 900000) }),
};
