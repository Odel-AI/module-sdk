# @odel/module-sdk

[![npm version](https://img.shields.io/npm/v/@odel/module-sdk?logo=npm)](https://www.npmjs.com/package/@odel/module-sdk)
[![provenance](https://img.shields.io/badge/npm-provenance-blue?logo=npm)](https://www.npmjs.com/package/@odel/module-sdk#provenance)
[![license](https://img.shields.io/npm/l/@odel/module-sdk)](./LICENSE)

> A thin, additive wrapper over the [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) for building Odel modules on Cloudflare Workers.

Every release is published from CI via npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) with signed [provenance](https://docs.npmjs.com/generating-provenance-statements) — no long-lived tokens.

The official MCP SDK owns the protocol. This package adds only Odel's conventions on top: the per-request **context/secrets envelope**, typed errors, input validators, response schemas, and code-declared config. No fork, no hand-rolled protocol — just `@modelcontextprotocol/sdk` plus a handful of helpers.

## Installation

```bash
npm install @odel/module-sdk zod
npm install -D wrangler @cloudflare/workers-types
```

`@modelcontextprotocol/sdk` comes along as a dependency; `zod` is a peer dependency (you import it directly in your module).

## Quick start

```typescript
import { createOdelServer, WebStandardStreamableHTTPServerTransport } from '@odel/module-sdk/server';
import { getModuleContext, getRequiredSecret, validators } from '@odel/module-sdk';
import { z } from 'zod';

function buildServer() {
	const server = createOdelServer({ name: 'my-module', version: '1.0.0' });

	server.registerTool(
		'greet',
		{ description: 'Greet the current user', inputSchema: { name: validators.nonEmptyString() } },
		async ({ name }, extra) => {
			const ctx = getModuleContext(extra); // { userId, displayName, conversationId?, requestId, timestamp }
			const result = { success: true as const, greeting: `Hello ${name}, from ${ctx.displayName}` };
			return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
		}
	);

	return server;
}

export default {
	async fetch(request: Request): Promise<Response> {
		const server = buildServer();
		const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
		await server.connect(transport);
		return transport.handleRequest(request);
	}
};
```

Use **`createOdelServer`** rather than `McpServer` directly: it's a thin wrapper that always registers the **`odel://config`** marker resource (see below), so your module is identifiable as an Odel module and its declared config is discoverable — even if it declares none. (`McpServer` is still re-exported if you need it.)

A fresh server + transport per request is the canonical **stateless** pattern for Workers. With `sessionIdGenerator: undefined` the transport accepts a single `tools/call` with no `initialize` handshake — which is exactly how Odel's mcp-proxy invokes modules.

See [`examples/calculator-basic`](./examples/calculator-basic) for a minimal, runnable module, or [`examples/foobar`](./examples/foobar) for an all-features reference that exercises the context envelope, declared config/secrets, typed errors, and output schemas.

## The context envelope

Odel's mcp-proxy authenticates the user, resolves their per-module secrets, and injects them into each request's `params._meta` under namespaced keys:

- `app.odel/context` — identity (`userId`, `displayName`, `conversationId?`, `requestId`, `timestamp`)
- `app.odel/secrets` — the per-user secret map for this module

The official SDK surfaces `params._meta` to tool handlers as `extra._meta`, so you read all of this from the handler's `extra`:

```typescript
import { getModuleContext, getRequiredSecret, getOptionalSecret } from '@odel/module-sdk';

const ctx = getModuleContext(extra);              // identity, with anonymous fallbacks
const apiKey = getRequiredSecret(extra, 'KEY');   // throws ModuleError if missing
const maybe = getOptionalSecret(extra, 'WEBHOOK'); // string | undefined
```

## Declaring config in code

Declare the secrets/config your module needs as a Zod schema. `parseConfig` validates the envelope and returns a typed, validated object; `configRequiredSecretNames` is what the dev-portal extracts into the module's required-secrets list.

```typescript
import { parseConfig } from '@odel/module-sdk';
import { z } from 'zod';

export const configSchema = z.object({
	RESEND_API_KEY: z.string().min(1).describe('Resend API key'),
	FROM_ADDRESS: z.string().email().optional().describe('Override sender'),
});

// inside a handler:
const cfg = parseConfig(configSchema, extra); // { RESEND_API_KEY: string; FROM_ADDRESS?: string }
```

## The `odel://config` marker

Every server made with `createOdelServer` exposes an MCP resource at **`odel://config`** — shape `{ secrets: [{ name, description, required }] }`, derived from your `configSchema` (or `{ secrets: [] }` when you declare none). It does double duty: it's the **marker that identifies an Odel module** to Odel tooling (the inspector tells Odel servers from plain MCP servers by its presence), and it lets clients **discover what config a module needs** to drive secret-entry UI. If you construct `McpServer` yourself, call `registerOdelConfig(server, configSchema?)` to expose it.

## What's exported

| Import | Provides |
| --- | --- |
| `@odel/module-sdk/server` | `createOdelServer`, `McpServer`, `WebStandardStreamableHTTPServerTransport`, `CallToolResult`, `RequestHandlerExtra` |
| `@odel/module-sdk` | `getModuleContext`, `getRequiredSecret`, `getOptionalSecret`, `createToolContext`, `parseConfig`, `configRequiredSecretNames`, `buildConfigManifest`, `registerOdelConfig`, `ODEL_CONFIG_URI`, `validators`, `ModuleError`, `ErrorCode`, `SuccessResponseSchema`, `SimpleSuccessSchema`, types |
| `@odel/module-sdk/odel` | same helper surface as the root (explicit subpath) |

## License

MIT
