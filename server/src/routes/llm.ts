import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { streamLLM, getAvailableProviders } from '../services/llm-service.js';
import type { AuthUser, LLMChatRequest } from '../types.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.use('*', requireAuth);

// POST /api/llm/chat — SSE streaming response
app.post('/chat', requireRole('admin', 'analyst'), async (c) => {
  const body = await c.req.json() as LLMChatRequest;

  if (!body.provider || !body.model || !body.messages) {
    return c.json({ error: 'Missing required fields: provider, model, messages' }, 400);
  }

  return streamSSE(c, async (stream) => {
    const controller = new AbortController();

    c.req.raw.signal.addEventListener('abort', () => {
      controller.abort();
    });

    await streamLLM(body, {
      onChunk: (text) => {
        stream.writeSSE({ data: JSON.stringify({ type: 'chunk', content: text }) });
      },
      onDone: (stopReason) => {
        stream.writeSSE({ data: JSON.stringify({ type: 'done', stopReason }) });
      },
      onError: (error) => {
        stream.writeSSE({ data: JSON.stringify({ type: 'error', error }) });
      },
    }, controller.signal);
  });
});

// GET /api/llm/config — available providers (no keys exposed)
app.get('/config', async (c) => {
  const providers = getAvailableProviders();
  return c.json({ providers });
});

export default app;
