import { useState, useEffect, useCallback, useRef } from 'react';
import type { LLMProvider } from '../types';
import { nanoid } from 'nanoid';

interface SendRequestOptions {
  provider: LLMProvider;
  model: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  apiKey: string;
  systemPrompt?: string;
}

export function useLLM() {
  const [extensionAvailable, setExtensionAvailable] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onCompleteRef = useRef<((content: string) => void) | null>(null);
  const accumulatedRef = useRef('');

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data?.type === 'TC_EXTENSION_READY') {
        setExtensionAvailable(true);
        return;
      }

      if (event.data?.type === 'TC_LLM_CHUNK') {
        accumulatedRef.current += event.data.content;
        setStreamingContent(accumulatedRef.current);
        return;
      }

      if (event.data?.type === 'TC_LLM_DONE') {
        const finalContent = accumulatedRef.current;
        setActiveRequestId(null);
        onCompleteRef.current?.(finalContent);
        onCompleteRef.current = null;
        return;
      }

      if (event.data?.type === 'TC_LLM_ERROR') {
        setError(event.data.error);
        setActiveRequestId(null);
        setStreamingContent('');
        accumulatedRef.current = '';
        onCompleteRef.current = null;
        return;
      }
    };

    window.addEventListener('message', handler);

    // Ping the extension in case it loaded before this listener was ready
    window.postMessage({ type: 'TC_EXTENSION_PING' }, '*');

    return () => window.removeEventListener('message', handler);
  }, []);

  const sendRequest = useCallback((opts: SendRequestOptions, onComplete: (content: string) => void): string => {
    const requestId = nanoid();
    setError(null);
    setStreamingContent('');
    accumulatedRef.current = '';
    setActiveRequestId(requestId);
    onCompleteRef.current = onComplete;

    window.postMessage({
      type: 'TC_LLM_REQUEST',
      requestId,
      payload: {
        provider: opts.provider,
        model: opts.model,
        messages: opts.messages,
        apiKey: opts.apiKey,
        systemPrompt: opts.systemPrompt,
      },
    }, '*');

    return requestId;
  }, []);

  const abort = useCallback(() => {
    if (activeRequestId) {
      window.postMessage({ type: 'TC_LLM_ABORT', requestId: activeRequestId }, '*');
      setActiveRequestId(null);
      setStreamingContent('');
      accumulatedRef.current = '';
      onCompleteRef.current = null;
    }
  }, [activeRequestId]);

  return {
    extensionAvailable,
    streamingContent,
    activeRequestId,
    error,
    sendRequest,
    abort,
    isStreaming: activeRequestId !== null,
  };
}
