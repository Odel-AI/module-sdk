/**
 * Server surface — re-exported from the official MCP SDK.
 *
 * So module authors install a single dependency (`@odel/module-sdk`) and import
 * the MCP server primitives from one place:
 *
 * ```typescript
 * import { McpServer, WebStandardStreamableHTTPServerTransport } from '@odel/module-sdk/server';
 * ```
 *
 * These are the unmodified official implementations; Odel adds nothing to the
 * protocol layer. The `WebStandardStreamableHTTPServerTransport` runs on
 * Cloudflare Workers (and any Web-standard runtime). Run it stateless
 * (`{ sessionIdGenerator: undefined }`) for single-shot `tools/call` modules.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerOdelConfig, type ConfigSchema } from './odel/config.js';

export { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
export type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
export type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export interface CreateOdelServerOptions {
	/** Module name (MCP server name). */
	name: string;
	/** Module version. */
	version: string;
	/**
	 * Declared config/secrets schema, advertised at the `odel://config` resource.
	 * Omit it for a module with no config — the marker resource is still exposed
	 * (as `{ secrets: [] }`).
	 */
	configSchema?: ConfigSchema;
}

/**
 * Create an `McpServer` that always advertises the `odel://config` marker
 * resource (see `registerOdelConfig`). Prefer this over `new McpServer(...)` so
 * every Odel module is identifiable and its config is discoverable by Odel
 * tooling — even when it declares no config.
 *
 * @example
 * ```typescript
 * const server = createOdelServer({ name: 'my-module', version: '1.0.0', configSchema });
 * server.registerTool(...);
 * ```
 */
export function createOdelServer(options: CreateOdelServerOptions): McpServer {
	const server = new McpServer({ name: options.name, version: options.version });
	registerOdelConfig(server, options.configSchema);
	return server;
}
