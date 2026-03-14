#!/usr/bin/env node
// tc — ThreatCaddy CLI for AI agents via Chrome DevTools Protocol
// Connects to a live ThreatCaddy browser tab and executes tool calls.
// Requires Node 22+ (built-in WebSocket) and Chrome remote debugging enabled.
// No npm dependencies.

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

const TIMEOUT = 15000;

// ── Chrome DevTools connection ──────────────────────────────────────────

function getDebugWsUrl() {
  const candidates = [
    resolve(homedir(), 'Library/Application Support/Google/Chrome/DevToolsActivePort'),
    resolve(homedir(), '.config/google-chrome/DevToolsActivePort'),
    resolve(homedir(), '.config/chromium/DevToolsActivePort'),
  ];
  const portFile = candidates.find(p => existsSync(p));
  if (!portFile) {
    throw new Error(
      'Chrome remote debugging not enabled.\n' +
      'Open chrome://inspect/#remote-debugging and toggle the switch.'
    );
  }
  const lines = readFileSync(portFile, 'utf8').trim().split('\n');
  return `ws://127.0.0.1:${lines[0]}${lines[1]}`;
}

class CDP {
  #ws; #id = 0; #pending = new Map();

  async connect(wsUrl) {
    return new Promise((res, rej) => {
      this.#ws = new WebSocket(wsUrl);
      this.#ws.onopen = () => res();
      this.#ws.onerror = (e) => rej(new Error('WebSocket error: ' + (e.message || e.type)));
      this.#ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && this.#pending.has(msg.id)) {
          const { resolve, reject } = this.#pending.get(msg.id);
          this.#pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      const msg = { id, method, params };
      if (sessionId) msg.sessionId = sessionId;
      this.#ws.send(JSON.stringify(msg));
      setTimeout(() => {
        if (this.#pending.has(id)) {
          this.#pending.delete(id);
          reject(new Error(`Timeout: ${method}`));
        }
      }, TIMEOUT);
    });
  }

  close() { this.#ws.close(); }
}

// ── Find ThreatCaddy tab ────────────────────────────────────────────────

async function findThreatCaddyTab(cdp) {
  const { targetInfos } = await cdp.send('Target.getTargets');
  const pages = targetInfos.filter(t => t.type === 'page');

  // Match by window.threatcaddy presence, URL patterns, or title
  const tcPatterns = [
    /threatcaddy/i,
    /localhost:\d+/,  // dev server
    /127\.0\.0\.1:\d+/,
  ];

  // First try: find by title containing ThreatCaddy
  let target = pages.find(p => /threatcaddy/i.test(p.title));

  // Second try: find by URL
  if (!target) {
    target = pages.find(p => tcPatterns.some(re => re.test(p.url)));
  }

  if (!target) {
    const pageList = pages.map(p => `  ${p.targetId.slice(0, 8)}  ${p.title.slice(0, 50)}  ${p.url}`).join('\n');
    throw new Error(
      'ThreatCaddy tab not found. Open tabs:\n' + pageList +
      '\n\nOpen ThreatCaddy in Chrome first, or use --target <id> to specify a tab.'
    );
  }

  return target;
}

// ── Execute in page context ─────────────────────────────────────────────

async function evalInPage(cdp, sessionId, expression) {
  await cdp.send('Runtime.enable', {}, sessionId);
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId);

  if (result.exceptionDetails) {
    const desc = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
    throw new Error(`Page eval error: ${desc}`);
  }

  return result.result.value;
}

// ── Commands ────────────────────────────────────────────────────────────

async function execTool(cdp, sessionId, toolName, input) {
  const inputJson = JSON.stringify(input);
  const expr = `window.threatcaddy.exec(${JSON.stringify(toolName)}, ${inputJson})`;
  return evalInPage(cdp, sessionId, expr);
}

async function listTools(cdp, sessionId) {
  return evalInPage(cdp, sessionId, 'JSON.stringify(window.threatcaddy.tools())');
}

async function getInvestigations(cdp, sessionId) {
  return evalInPage(cdp, sessionId, 'window.threatcaddy.investigations()');
}

async function getFolderId(cdp, sessionId) {
  return evalInPage(cdp, sessionId, 'window.threatcaddy.folderId()');
}

async function setFolderId(cdp, sessionId, id) {
  return evalInPage(cdp, sessionId, `window.threatcaddy.setFolderId(${JSON.stringify(id)})`);
}

async function checkBridge(cdp, sessionId) {
  return evalInPage(cdp, sessionId,
    `JSON.stringify({ version: window.threatcaddy?.version, tools: window.threatcaddy?.tools()?.length, folderId: window.threatcaddy?.folderId() })`
  );
}

// ── Main ────────────────────────────────────────────────────────────────

const USAGE = `tc — ThreatCaddy CLI for AI agents

Usage: tc <command> [args]

  status                              Check bridge connection and version
  investigations                      List all investigations
  folder [id]                         Get or set the active investigation
  tools                               List available tool names
  exec <tool_name> '<json_input>'     Execute a CaddyAI tool
  help                                Show this help

Examples:
  tc status
  tc investigations
  tc folder abc123
  tc exec search_notes '{"query": "malware"}'
  tc exec create_note '{"title": "Finding", "content": "# APT29 activity detected"}'
  tc exec bulk_create_iocs '{"iocs": [{"type":"ipv4","value":"10.0.0.1","confidence":"high"}]}'
  tc exec create_timeline_event '{"title": "Initial access", "timestamp": "2025-06-15T14:00:00Z", "eventType": "initial-access"}'

Prerequisites:
  1. Chrome remote debugging: chrome://inspect/#remote-debugging → toggle on
  2. ThreatCaddy open in a Chrome tab
  3. Node.js 22+
`;

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  // Parse optional --target flag
  let targetOverride;
  const targetIdx = args.indexOf('--target');
  if (targetIdx !== -1) {
    targetOverride = args[targetIdx + 1];
    args.splice(targetIdx, 2);
  }

  // Connect to Chrome
  const cdp = new CDP();
  try {
    await cdp.connect(getDebugWsUrl());
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  // Find ThreatCaddy tab
  let target;
  try {
    if (targetOverride) {
      const { targetInfos } = await cdp.send('Target.getTargets');
      target = targetInfos.find(t =>
        t.targetId.toUpperCase().startsWith(targetOverride.toUpperCase())
      );
      if (!target) throw new Error(`No tab matching target prefix: ${targetOverride}`);
    } else {
      target = await findThreatCaddyTab(cdp);
    }
  } catch (e) {
    console.error(e.message);
    cdp.close();
    process.exit(1);
  }

  // Attach to tab
  let sessionId;
  try {
    const res = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    sessionId = res.sessionId;
  } catch (e) {
    console.error(`Failed to attach to tab: ${e.message}`);
    cdp.close();
    process.exit(1);
  }

  // Verify bridge exists
  try {
    const check = await evalInPage(cdp, sessionId, 'typeof window.threatcaddy');
    if (check !== 'object') {
      console.error('ThreatCaddy bridge not found on this tab. Is ThreatCaddy loaded?');
      cdp.close();
      process.exit(1);
    }
  } catch (e) {
    console.error(`Cannot reach ThreatCaddy tab: ${e.message}`);
    cdp.close();
    process.exit(1);
  }

  try {
    switch (cmd) {
      case 'status': {
        const info = await checkBridge(cdp, sessionId);
        console.log(info);
        break;
      }
      case 'investigations': {
        const result = await getInvestigations(cdp, sessionId);
        console.log(result);
        break;
      }
      case 'folder': {
        if (args[1]) {
          await setFolderId(cdp, sessionId, args[1]);
          console.log(`Active investigation set to: ${args[1]}`);
        } else {
          const id = await getFolderId(cdp, sessionId);
          console.log(id || '(none)');
        }
        break;
      }
      case 'tools': {
        const result = await listTools(cdp, sessionId);
        console.log(result);
        break;
      }
      case 'exec': {
        const toolName = args[1];
        if (!toolName) {
          console.error('Usage: tc exec <tool_name> \'<json_input>\'');
          process.exit(1);
        }
        let input = {};
        if (args[2]) {
          try {
            input = JSON.parse(args.slice(2).join(' '));
          } catch (e) {
            console.error(`Invalid JSON input: ${e.message}`);
            process.exit(1);
          }
        }
        const result = await execTool(cdp, sessionId, toolName, input);
        console.log(result);
        break;
      }
      default:
        console.error(`Unknown command: ${cmd}\n`);
        console.log(USAGE);
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }

  cdp.close();
  setTimeout(() => process.exit(0), 100);
}

main().catch(e => { console.error(e.message); process.exit(1); });
