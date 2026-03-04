import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';
import { getPrivateKey, getPublicKey } from './auth.js';

const ADMIN_AUDIENCE = 'admin-panel';

export async function signAdminToken(): Promise<string> {
  const key = await getPrivateKey();
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: 'EdDSA' })
    .setAudience(ADMIN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
}

export const requireAdminAuth = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization header' }, 401);
  }
  const token = header.slice(7);
  try {
    const key = await getPublicKey();
    await jose.jwtVerify(token, key, { audience: ADMIN_AUDIENCE });
  } catch {
    return c.json({ error: 'Invalid or expired admin token' }, 401);
  }
  await next();
});
