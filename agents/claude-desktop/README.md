# ThreatCaddy — Claude Desktop (MCP Server)

Future: MCP server that exposes ThreatCaddy's 29 tools for Claude Desktop.

## Status

Not yet implemented. See `../claude-code/` for the CDP-based approach that works today.

## Planned Architecture

```
Claude Desktop ←stdio→ MCP Server (Node.js) ←WebSocket→ Browser App (IndexedDB)
```
