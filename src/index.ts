/**
 * @odel/module-sdk
 *
 * A thin, additive wrapper over the Model Context Protocol TypeScript SDK
 * (`@modelcontextprotocol/sdk`) for building Odel modules on Cloudflare Workers.
 *
 * The official SDK owns the MCP protocol; this package adds only Odel's
 * conventions — the per-request context/secrets envelope, typed errors,
 * validators, response schemas, and code-declared config.
 *
 * - Module helpers (this root, and `@odel/module-sdk/odel`)
 * - MCP server primitives (`@odel/module-sdk/server`)
 *
 * @example
 * ```typescript
 * import { McpServer, WebStandardStreamableHTTPServerTransport } from '@odel/module-sdk/server';
 * import { getModuleContext, getRequiredSecret, validators } from '@odel/module-sdk';
 * import { z } from 'zod';
 *
 * const server = new McpServer({ name: 'my-module', version: '1.0.0' });
 * server.registerTool(
 *   'greet',
 *   { description: 'Greet the user', inputSchema: { name: validators.nonEmptyString() } },
 *   async ({ name }, extra) => {
 *     const ctx = getModuleContext(extra);
 *     return { content: [{ type: 'text', text: `Hello ${name}, from ${ctx.userId}` }] };
 *   }
 * );
 *
 * export default {
 *   async fetch(request: Request): Promise<Response> {
 *     const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
 *     await server.connect(transport);
 *     return transport.handleRequest(request);
 *   }
 * };
 * ```
 */

export * from './odel/index.js';
