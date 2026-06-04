# FooBar — Odel reference / test module

FooBar is a deliberately feature-complete Odel module. It's not useful work — it's a **stable target for testing**: a reference for module authors, a server for client/inspector developers to point at, and a fixture for verifying `@odel/module-sdk` end-to-end. As the SDK gains features, FooBar gains tools to exercise them.

## Tools

| Tool | Input | Demonstrates |
| --- | --- | --- |
| `echo` | `{ message }` | the simplest tool + input validation |
| `whoami` | – | reading the Odel identity context (`getModuleContext`) |
| `compute` | `{ a, b, op }` | typed numeric input, enum, `SuccessResponseSchema`, error branch (divide-by-zero) |
| `check_config` | – | per-user secrets via `parseConfig(configSchema, extra)`; throws `MISSING_SECRET`/`INVALID_SECRET`; returns only masked status |
| `boom` | `{ kind }` | throwing every category of `ModuleError` for client error-handling tests |
| `slow_echo` | `{ message, delayMs }` | bounded delay for testing client timeouts/loading states |

## Config

Declared via an exported Zod `configSchema`:

- `FOOBAR_API_KEY` (**required**) — any non-empty string; FooBar checks presence only, never the value.
- `FOOBAR_WEBHOOK_URL` (optional) — must be a valid URL if provided.

FooBar advertises this over MCP as a resource at **`odel://config`** (shape `{ secrets: [{ name, description, required }] }`), which the inspector's Vars tab reads to prefill (see Odel#121).

## Run it

```bash
pnpm install                                  # from the repo root (workspace-links @odel/module-sdk)
pnpm --filter foobar-module-example dev       # wrangler dev (default :8787)
```

Call it the way Odel's mcp-proxy does — a bare `tools/call` carrying the context/secrets envelope:

```bash
curl -s localhost:8787 \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{
    "jsonrpc":"2.0","id":1,"method":"tools/call",
    "params":{
      "name":"check_config","arguments":{},
      "_meta":{
        "app.odel/context":{"userId":"u_1","displayName":"Ada"},
        "app.odel/secrets":{"FOOBAR_API_KEY":"demo-key"}
      }
    }
  }'
```

Drop the `_meta` to see the anonymous-context fallback (`whoami`) and the `MISSING_SECRET` error (`check_config`).
