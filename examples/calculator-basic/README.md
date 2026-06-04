# calculator-basic (example)

The reference Odel module built on `@odel/module-sdk` v2. Four arithmetic tools (`add`, `subtract`, `multiply`, `divide`) served over the stateless Web-standard Streamable HTTP transport. Needs no secrets.

```bash
pnpm install        # from the repo root (links @odel/module-sdk via the workspace)
pnpm --filter calculator-basic-example dev   # wrangler dev
```

Call it like mcp-proxy does — a bare `tools/call`, no initialize handshake:

```bash
curl -s localhost:8787 \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "add",
      "arguments": { "a": 2, "b": 3 },
      "_meta": { "app.odel/context": { "userId": "u_1", "displayName": "Ada" } }
    }
  }'
```

See `src/index.ts` for the pattern, including the commented `configSchema` block for modules that need secrets.
