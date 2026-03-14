# ThreatCaddy Agent Integrations

External AI agents can read and write data in a live ThreatCaddy session. All 29 CaddyAI tools are accessible — search, create, update, analyze, and report across investigations.

## How It Works

ThreatCaddy exposes `window.threatcaddy` in the browser. AI agents connect via Chrome DevTools Protocol and call tools by evaluating JavaScript in the page context. Data stays in IndexedDB — nothing leaves the machine.

```
AI Agent → Chrome CDP → window.threatcaddy.exec(tool, input) → IndexedDB → result
```

## Available Integrations

| Agent | Directory | Status |
|-------|-----------|--------|
| **Claude Code** | `claude-code/` | Ready |
| **Claude Desktop** | `claude-desktop/` | Planned (MCP) |
| **OpenAI Codex** | `codex/` | Planned |

## Quick Start (Claude Code)

```bash
# 1. Enable Chrome remote debugging
#    chrome://inspect/#remote-debugging → toggle on

# 2. Open ThreatCaddy in Chrome and select an investigation

# 3. Use the CLI
node agents/claude-code/scripts/tc.mjs status
node agents/claude-code/scripts/tc.mjs exec create_note '{"title":"Test","content":"Hello from Claude Code"}'
```
