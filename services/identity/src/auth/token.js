import { SignJWT, jwtVerify } from 'jose';

export async function issueToken(account, config, now = Date.now()) {
  const seconds = Math.floor(now / 1000);
  return new SignJWT({ authVersion: account.authVersion })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(account._id))
    .setIssuedAt(seconds)
    .setExpirationTime(seconds + 7200)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .sign(config.jwtKey);
}

/** Cryptographic validation only. Current DB authority is a separate TASK-006 gate. */
export async function verifyToken(token, config, now = Date.now()) {
  const { payload } = await jwtVerify(token, config.jwtKey, {
    algorithms: ['HS256'],
    issuer: config.issuer,
    audience: config.audience,
    currentDate: new Date(now),
    clockTolerance: 0,
    requiredClaims: ['sub', 'authVersion', 'iat', 'exp', 'iss', 'aud'],
  });
  if (
    !/^[a-f0-9]{24}$/.test(payload.sub) ||
    !Number.isSafeInteger(payload.authVersion) ||
    payload.authVersion < 0 ||
    !Number.isSafeInteger(payload.iat) ||
    !Number.isSafeInteger(payload.exp) ||
    payload.exp !== payload.iat + 7200 ||
    payload.iat > Math.floor(now / 1000)
  )
    throw new Error('Invalid token claims');
  return payload;
}
