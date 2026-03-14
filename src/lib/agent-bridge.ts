/**
 * Agent Bridge — exposes ThreatCaddy's tool API on `window.threatcaddy`
 * so external AI agents (Claude Code, Codex, etc.) can interact with
 * the live session via Chrome DevTools Protocol `Runtime.evaluate`.
 *
 * The bridge is intentionally minimal: it exposes executeTool and the
 * current folderId, and lets agents call any of the 29 CaddyAI tools.
 */

import { executeTool } from './llm-tools';
import { TOOL_DEFINITIONS } from './llm-tool-defs';
import { db } from '../db';
import type { ToolUseBlock } from '../types';

interface ThreatCaddyBridge {
  /** Execute a CaddyAI tool by name with JSON input. Returns JSON string. */
  exec: (toolName: string, input: Record<string, unknown>) => Promise<string>;
  /** List available tool names */
  tools: () => string[];
  /** Get the currently selected investigation (folder) ID, if any */
  folderId: () => string | undefined;
  /** Set the active investigation by ID */
  setFolderId: (id: string | undefined) => void;
  /** List investigations with basic metadata */
  investigations: () => Promise<string>;
  /** Bridge version for compatibility checks */
  version: string;
}

let activeFolderId: string | undefined;

const bridge: ThreatCaddyBridge = {
  version: '1.0.0',

  async exec(toolName: string, input: Record<string, unknown> = {}): Promise<string> {
    const toolUse: ToolUseBlock = {
      type: 'tool_use',
      id: `agent-${Date.now()}`,
      name: toolName,
      input,
    };
    const { result, isError } = await executeTool(toolUse, activeFolderId);
    if (isError) throw new Error(result);
    return result;
  },

  tools(): string[] {
    return TOOL_DEFINITIONS.map(t => t.name);
  },

  folderId(): string | undefined {
    return activeFolderId;
  },

  setFolderId(id: string | undefined): void {
    activeFolderId = id;
  },

  async investigations(): Promise<string> {
    const folders = await db.folders.toArray();
    return JSON.stringify(folders.map(f => ({
      id: f.id,
      name: f.name,
      status: f.status || 'active',
    })));
  },
};

/** Call once at app startup to expose the bridge on window. */
export function installAgentBridge(): void {
  (window as unknown as Record<string, unknown>).threatcaddy = bridge;
}

/** Keep the bridge folderId in sync with the app's selected folder. */
export function syncBridgeFolderId(folderId: string | undefined): void {
  activeFolderId = folderId;
}
