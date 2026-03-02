import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import type { ChatThread, ChatMessage, LLMProvider, Settings, Folder } from '../../types';
import { ChatMessageBubble } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useLLM } from '../../hooks/useLLM';
import { cn, formatDate } from '../../lib/utils';
import { nanoid } from 'nanoid';

interface ChatViewProps {
  threads: ChatThread[];
  selectedThreadId?: string;
  onSelectThread: (id: string) => void;
  onCreateThread: (partial?: Partial<ChatThread>) => Promise<ChatThread>;
  onUpdateThread: (id: string, updates: Partial<ChatThread>) => void;
  onAddMessage: (threadId: string, message: ChatMessage) => Promise<void>;
  onTrashThread: (id: string) => void;
  settings: Settings;
  selectedFolderId?: string;
  selectedFolder?: Folder;
}

export function ChatView({
  threads,
  selectedThreadId,
  onSelectThread,
  onCreateThread,
  onUpdateThread,
  onAddMessage,
  onTrashThread,
  settings,
  selectedFolderId,
  selectedFolder,
}: ChatViewProps) {
  const { extensionAvailable, streamingContent, isStreaming, error, sendRequest, abort } = useLLM();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeThread = threads.find((t) => t.id === selectedThreadId);

  // Scroll to bottom on new messages or streaming content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages?.length, streamingContent]);

  // Show LLM errors
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (error) setLocalError(error);
  }, [error]);

  const handleNewChat = useCallback(async () => {
    try {
      const defaultModel = settings.llmDefaultModel || 'claude-sonnet-4-6';
      const defaultProvider = settings.llmDefaultProvider || 'anthropic';
      const thread = await onCreateThread({
        model: defaultModel,
        provider: defaultProvider,
        folderId: selectedFolderId,
      });
      onSelectThread(thread.id);
    } catch (err) {
      console.error('Failed to create chat thread:', err);
      setLocalError('Failed to create chat thread. Try refreshing the page.');
    }
  }, [onCreateThread, onSelectThread, settings, selectedFolderId]);

  const handleSend = useCallback(async (text: string) => {
    if (!activeThread) return;
    setLocalError(null);

    // Get API key (trim whitespace from copy-paste)
    const apiKey = (activeThread.provider === 'anthropic'
      ? settings.llmAnthropicApiKey
      : settings.llmOpenAIApiKey)?.trim();

    if (!apiKey) {
      setLocalError(`No ${activeThread.provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key configured. Add it in Settings.`);
      return;
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    await onAddMessage(activeThread.id, userMsg);

    // Build system prompt from investigation context
    let systemPrompt = 'You are a helpful AI assistant for threat investigation and security analysis.';
    if (selectedFolder) {
      systemPrompt += `\n\nCurrent investigation: "${selectedFolder.name}"`;
      if (selectedFolder.description) {
        systemPrompt += `\nDescription: ${selectedFolder.description}`;
      }
    }

    // Build conversation messages
    const conversationMessages = [...activeThread.messages, userMsg].map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Send to LLM
    sendRequest(
      {
        provider: activeThread.provider,
        model: activeThread.model,
        messages: conversationMessages,
        apiKey,
        systemPrompt,
      },
      async (finalContent) => {
        const assistantMsg: ChatMessage = {
          id: nanoid(),
          role: 'assistant',
          content: finalContent,
          model: activeThread.model,
          createdAt: Date.now(),
        };
        await onAddMessage(activeThread.id, assistantMsg);
      }
    );
  }, [activeThread, settings, selectedFolder, sendRequest, onAddMessage]);

  const handleModelChange = useCallback((model: string, provider: LLMProvider) => {
    if (activeThread) {
      onUpdateThread(activeThread.id, { model, provider });
    }
  }, [activeThread, onUpdateThread]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Thread list */}
      <div className="w-56 border-r border-border-subtle flex flex-col shrink-0">
        <div className="p-2 border-b border-border-subtle">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg bg-purple text-white text-xs font-medium hover:brightness-110 transition-all"
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="p-4 text-center text-text-muted text-xs">
              No chat threads yet
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectThread(thread.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelectThread(thread.id); }}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-b border-border-subtle',
                  selectedThreadId === thread.id
                    ? 'bg-bg-active text-text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                )}
              >
                <MessageSquare size={14} className="shrink-0 text-text-muted" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{thread.title}</div>
                  <div className="text-[10px] text-text-muted font-mono">{formatDate(thread.updatedAt)}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onTrashThread(thread.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-bg-hover text-text-muted hover:text-red-400 transition-all shrink-0"
                  title="Delete thread"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeThread ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeThread.messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center h-full text-text-muted">
                  <MessageSquare size={40} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">Start a conversation</p>
                  <p className="text-xs mt-1">Messages are stored locally and encrypted at rest</p>
                </div>
              )}
              {activeThread.messages.map((msg) => (
                <ChatMessageBubble key={msg.id} role={msg.role} content={msg.content} />
              ))}
              {isStreaming && streamingContent && (
                <ChatMessageBubble role="assistant" content={streamingContent} isStreaming />
              )}
              {localError && (
                <div className="mx-auto max-w-md my-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {localError}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              onStop={abort}
              isStreaming={isStreaming}
              extensionAvailable={extensionAvailable}
              model={activeThread.model}
              onModelChange={handleModelChange}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <MessageSquare size={48} className="mb-3 opacity-20" />
            <p className="text-lg font-medium">AI Chat</p>
            <p className="text-sm mt-1">Select a thread or create a new one</p>
            {!extensionAvailable && (
              <p className="text-xs mt-3 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                ThreatCaddy browser extension required for AI chat
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
