import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';
import { randomBytes } from 'node:crypto';

const ADMIN_AUDIENCE = 'admin-panel';

// Separate HMAC key for admin tokens — generated at startup, lives in memory only.
// Admin tokens auto-invalidate on server restart (feature, not bug).
let adminKey: Uint8Array | null = null;

export function initAdminKey(): void {
  adminKey = randomBytes(32);
}

export async function signAdminToken(adminUserId: string, adminUsername: string): Promise<string> {
  if (!adminKey) throw new Error('Admin key not initialized');
  return new jose.SignJWT({ username: adminUsername })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(ADMIN_AUDIENCE)
    .setSubject(adminUserId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(adminKey);
}

export const requireAdminAuth = createMiddleware(async (c, next) => {
  if (!adminKey) return c.json({ error: 'Admin key not initialized' }, 500);
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization header' }, 401);
  }
  const token = header.slice(7);
  try {
    const { payload } = await jose.jwtVerify(token, adminKey, { audience: ADMIN_AUDIENCE });
    c.set('adminUserId', payload.sub || '__system_admin__');
    c.set('adminUsername', (payload as Record<string, unknown>).username || 'unknown');
  } catch {
    return c.json({ error: 'Invalid or expired admin token' }, 401);
  }
  await next();
});
