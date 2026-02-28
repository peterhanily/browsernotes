import { useMemo } from 'react';
import { renderMarkdown } from '../../lib/markdown';
import { extractIOCs, refangToDefanged } from '../../lib/ioc-extractor';

const NETWORK_IOC_TYPES = new Set(['url', 'domain', 'ipv4', 'ipv6', 'email']);

interface MarkdownPreviewProps {
  content: string;
  defanged?: boolean;
}

export function MarkdownPreview({ content, defanged }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    if (!defanged) return renderMarkdown(content);
    const iocs = extractIOCs(content);
    const networkValues = iocs
      .filter((i) => NETWORK_IOC_TYPES.has(i.type))
      .map((i) => i.value);
    // Sort longest-first to avoid partial replacements
    networkValues.sort((a, b) => b.length - a.length);
    let defangedContent = content;
    for (const value of networkValues) {
      defangedContent = defangedContent.replaceAll(value, refangToDefanged(value));
    }
    return renderMarkdown(defangedContent);
  }, [content, defanged]);

  return (
    <div
      className="markdown-preview text-gray-200 prose-invert"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
