import { useState, useRef, useEffect } from 'react';
import { Send, Square, Wifi, WifiOff } from 'lucide-react';
import type { LLMProvider } from '../../types';
import { cn } from '../../lib/utils';

const MODELS: { label: string; value: string; provider: LLMProvider }[] = [
  { label: 'Claude Opus 4', value: 'claude-opus-4-6', provider: 'anthropic' },
  { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-6', provider: 'anthropic' },
  { label: 'Claude Haiku 3.5', value: 'claude-3-5-haiku-latest', provider: 'anthropic' },
  { label: 'GPT-4o', value: 'gpt-4o', provider: 'openai' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini', provider: 'openai' },
];

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  extensionAvailable: boolean;
  model: string;
  onModelChange: (model: string, provider: LLMProvider) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, extensionAvailable, model, onModelChange, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border-subtle p-3 space-y-2">
      {/* Model selector + extension status */}
      <div className="flex items-center gap-2 text-xs">
        <select
          value={model}
          onChange={(e) => {
            const m = MODELS.find((m) => m.value === e.target.value);
            if (m) onModelChange(m.value, m.provider);
          }}
          className="bg-bg-deep border border-border-medium rounded px-2 py-1 text-text-secondary focus:outline-none focus:border-purple text-xs"
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <div className="flex-1" />
        <div className={cn(
          'flex items-center gap-1 text-[10px]',
          extensionAvailable ? 'text-accent-green' : 'text-text-muted'
        )}>
          {extensionAvailable ? <Wifi size={10} /> : <WifiOff size={10} />}
          {extensionAvailable ? 'Extension' : 'No extension'}
        </div>
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={extensionAvailable ? 'Send a message...' : 'Extension required for AI chat'}
          disabled={!extensionAvailable || disabled}
          rows={1}
          className="flex-1 bg-bg-deep border border-border-medium rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-purple disabled:opacity-50"
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            title="Stop generating"
          >
            <Square size={14} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() || !extensionAvailable || disabled}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-purple/20 text-purple hover:bg-purple/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
