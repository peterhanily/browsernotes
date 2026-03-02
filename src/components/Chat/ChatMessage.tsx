import { cn } from '../../lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

function renderMarkdown(text: string): string {
  let html = text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-bg-deep rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-bg-deep rounded px-1 py-0.5 text-xs font-mono">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="mt-2">');

  // Wrap in paragraph
  html = '<p>' + html + '</p>';
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

export function ChatMessageBubble({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex w-full mb-3', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-purple/20 text-text-primary rounded-br-sm'
            : 'bg-bg-raised text-text-primary rounded-bl-sm border border-border-subtle'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div
            className="prose-chat [&_pre]:my-2 [&_code]:text-xs [&_li]:my-0.5"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-purple/60 rounded-sm animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>
    </div>
  );
}
