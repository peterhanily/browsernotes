import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLLM } from '../hooks/useLLM';

// ── Helpers ──────────────────────────────────────────────────────────

/** Post a message to window as if from the extension bridge */
function postToWindow(data: Record<string, unknown>) {
  const event = new MessageEvent('message', {
    data,
    source: window,
    origin: window.location.origin,
  });
  window.dispatchEvent(event);
}

/** Wait for queued microtasks and RAF to execute */
async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

// ── Tests ────────────────────────────────────────────────────────────

describe('useLLM', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with extension unavailable', () => {
    const { result } = renderHook(() => useLLM());
    expect(result.current.extensionAvailable).toBe(false);
    expect(result.current.extensionInfo).toBeNull();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.streamingContent).toBe('');
  });

  it('detects extension when TC_EXTENSION_READY is received', async () => {
    const { result } = renderHook(() => useLLM());
    await act(async () => {
      postToWindow({ type: 'TC_EXTENSION_READY', protocolVersion: 2, capabilities: ['llm', 'fetch'] });
      await flush();
    });
    expect(result.current.extensionAvailable).toBe(true);
    expect(result.current.extensionInfo).toEqual({
      protocolVersion: 2,
      capabilities: ['llm', 'fetch'],
    });
  });

  it('defaults to protocol version 1 when not specified', async () => {
    const { result } = renderHook(() => useLLM());
    await act(async () => {
      postToWindow({ type: 'TC_EXTENSION_READY' });
      await flush();
    });
    expect(result.current.extensionInfo).toEqual({
      protocolVersion: 1,
      capabilities: [],
    });
  });

  it('sendAgentRequest posts TC_LLM_REQUEST and sets isStreaming', async () => {
    const messages: unknown[] = [];
    const origPostMessage = window.postMessage;
    window.postMessage = vi.fn((...args: Parameters<typeof window.postMessage>) => {
      messages.push(args[0]);
      origPostMessage.apply(window, args);
    });

    const { result } = renderHook(() => useLLM());
    await act(async () => { await flush(); });

    let requestId: string;
    act(() => {
      requestId = result.current.sendAgentRequest(
        {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          messages: [{ role: 'user', content: 'Hello' }],
          apiKey: 'test-key',
        },
        async () => ({ result: '{}', isError: false }),
        () => {},
      );
    });

    expect(result.current.isStreaming).toBe(true);
    expect(requestId!).toBeTruthy();

    const llmRequest = messages.find(
      (m) => (m as Record<string, unknown>).type === 'TC_LLM_REQUEST',
    ) as Record<string, unknown>;
    expect(llmRequest).toBeTruthy();
    expect(llmRequest.requestId).toBe(requestId!);

    window.postMessage = origPostMessage;
  });

  it('accumulates streaming content from TC_LLM_CHUNK messages', async () => {
    const { result } = renderHook(() => useLLM());
    await act(async () => { await flush(); });

    let rid: string;
    act(() => {
      rid = result.current.sendAgentRequest(
        {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          messages: [{ role: 'user', content: 'Hi' }],
          apiKey: 'key',
        },
        async () => ({ result: '{}', isError: false }),
        () => {},
      );
    });

    await act(async () => {
      postToWindow({ type: 'TC_LLM_CHUNK', requestId: rid!, content: 'Hello ' });
      postToWindow({ type: 'TC_LLM_CHUNK', requestId: rid!, content: 'world' });
      await flush();
      // requestAnimationFrame in jsdom fires on next tick
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.streamingContent).toBe('Hello world');
  });

  it('handles TC_LLM_ERROR and resets state', async () => {
    const { result } = renderHook(() => useLLM());
    await act(async () => { await flush(); });

    let rid: string;
    act(() => {
      rid = result.current.sendAgentRequest(
        {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          messages: [{ role: 'user', content: 'Hi' }],
          apiKey: 'key',
        },
        async () => ({ result: '{}', isError: false }),
        () => {},
      );
    });

    expect(result.current.isStreaming).toBe(true);

    await act(async () => {
      postToWindow({ type: 'TC_LLM_ERROR', requestId: rid!, error: 'API rate limit exceeded' });
      await flush();
    });

    expect(result.current.error).toBe('API rate limit exceeded');
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.streamingContent).toBe('');
  });

  it('ignores messages with mismatched requestId', async () => {
    const { result } = renderHook(() => useLLM());
    await act(async () => { await flush(); });

    act(() => {
      result.current.sendAgentRequest(
        {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          messages: [{ role: 'user', content: 'Hi' }],
          apiKey: 'key',
        },
        async () => ({ result: '{}', isError: false }),
        () => {},
      );
    });

    await act(async () => {
      postToWindow({ type: 'TC_LLM_CHUNK', requestId: 'wrong-id', content: 'Bad data' });
      await flush();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.streamingContent).toBe('');
  });

  it('abort sends TC_LLM_ABORT and clears state', async () => {
    const abortMessages: unknown[] = [];
    const origPostMessage = window.postMessage;
    window.postMessage = vi.fn((...args: Parameters<typeof window.postMessage>) => {
      abortMessages.push(args[0]);
      origPostMessage.apply(window, args);
    });

    const { result } = renderHook(() => useLLM());
    await act(async () => { await flush(); });

    const onComplete = vi.fn();
    act(() => {
      result.current.sendAgentRequest(
        {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          messages: [{ role: 'user', content: 'Hi' }],
          apiKey: 'key',
        },
        async () => ({ result: '{}', isError: false }),
        onComplete,
      );
    });

    act(() => {
      result.current.abort();
    });

    expect(result.current.isStreaming).toBe(false);

    const abortMsg = abortMessages.find(
      (m) => (m as Record<string, unknown>).type === 'TC_LLM_ABORT',
    );
    expect(abortMsg).toBeTruthy();

    window.postMessage = origPostMessage;
  });

  it('calls onComplete when TC_LLM_DONE is received with end_turn', async () => {
    const { result } = renderHook(() => useLLM());
    await act(async () => { await flush(); });

    const onComplete = vi.fn();
    let rid: string;
    act(() => {
      rid = result.current.sendAgentRequest(
        {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          messages: [{ role: 'user', content: 'Hi' }],
          apiKey: 'key',
        },
        async () => ({ result: '{}', isError: false }),
        onComplete,
      );
    });

    await act(async () => {
      postToWindow({ type: 'TC_LLM_CHUNK', requestId: rid!, content: 'Final answer' });
      await flush();
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      postToWindow({
        type: 'TC_LLM_DONE',
        requestId: rid!,
        stopReason: 'end_turn',
        contentBlocks: [{ type: 'text', text: 'Final answer' }],
      });
      await flush();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(onComplete).toHaveBeenCalledWith({
      content: 'Final answer',
      toolCalls: [],
    });
    expect(result.current.isStreaming).toBe(false);
  });

  it('executes tool calls on tool_use stop reason', async () => {
    const { result } = renderHook(() => useLLM());
    await act(async () => { await flush(); });

    const toolExecutor = vi.fn(async () => ({
      result: JSON.stringify({ count: 5 }),
      isError: false,
    }));

    let rid: string;
    act(() => {
      rid = result.current.sendAgentRequest(
        {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          messages: [{ role: 'user', content: 'Search notes' }],
          apiKey: 'key',
          tools: [{ name: 'search_notes', description: 'Search notes', input_schema: {} }],
        },
        toolExecutor,
        () => {},
      );
    });

    await act(async () => {
      postToWindow({
        type: 'TC_LLM_DONE',
        requestId: rid!,
        stopReason: 'tool_use',
        contentBlocks: [
          { type: 'text', text: 'Let me search.' },
          { type: 'tool_use', id: 'tool-1', name: 'search_notes', input: { query: 'test' } },
        ],
      });
      await flush();
      // Allow async tool execution
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(toolExecutor).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tool_use',
        id: 'tool-1',
        name: 'search_notes',
        input: { query: 'test' },
      }),
    );
  });

  it('clears error on new request', async () => {
    const { result } = renderHook(() => useLLM());
    await act(async () => { await flush(); });

    // Trigger an error
    let rid: string;
    act(() => {
      rid = result.current.sendAgentRequest(
        {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          messages: [{ role: 'user', content: 'Hi' }],
          apiKey: 'key',
        },
        async () => ({ result: '{}', isError: false }),
        () => {},
      );
    });

    await act(async () => {
      postToWindow({ type: 'TC_LLM_ERROR', requestId: rid!, error: 'fail' });
      await flush();
    });

    expect(result.current.error).toBe('fail');

    // New request should clear the error
    act(() => {
      result.current.sendAgentRequest(
        {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          messages: [{ role: 'user', content: 'Retry' }],
          apiKey: 'key',
        },
        async () => ({ result: '{}', isError: false }),
        () => {},
      );
    });

    expect(result.current.error).toBeNull();
  });

  it('returns toolActivity as empty array initially', () => {
    const { result } = renderHook(() => useLLM());
    expect(result.current.toolActivity).toEqual([]);
  });
});
