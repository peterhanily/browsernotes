import { createMiddleware } from 'hono/factory';
import { nanoid } from 'nanoid';

/**
 * Generates a short unique request ID per request, sets it on the
 * Hono context (`c.get('requestId')`) and in the `X-Request-Id`
 * response header so clients and logs can correlate.
 */
export const requestId = createMiddleware<{
  Variables: { requestId: string };
}>(async (c, next) => {
  const id = nanoid(8);
  c.set('requestId', id);
  c.header('X-Request-Id', id);
  await next();
});
