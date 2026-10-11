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

import { McpServer, type RegisteredTool, type ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema, ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { registerOdelConfig, type ConfigSchema } from './odel/config.js';
import { getConfiguredSecretNames, type HandlerExtraLike } from './odel/context.js';
import { ErrorCode, ModuleError } from './odel/errors.js';

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

/** Tool `_meta` key advertising the secrets a tool needs, as listed by `tools/list`. */
export const REQUIRES_SECRETS_META_KEY = 'app.odel/requiresSecrets';

/** `registerTool`'s config, plus Odel's `requiresSecrets`. */
export interface OdelToolConfig<OutputArgs, InputArgs> {
	title?: string;
	description?: string;
	inputSchema?: InputArgs;
	outputSchema?: OutputArgs;
	annotations?: ToolAnnotations;
	_meta?: Record<string, unknown>;
	/**
	 * Secrets this tool cannot run without. When Odel says which secrets the caller has
	 * configured, a tool missing any of them is left out of `tools/list`, and a call to it is
	 * answered `MISSING_SECRET` without running the handler. A request with no Odel envelope
	 * (a catalog probe, an inspector, local dev) lists and runs every tool as before.
	 */
	requiresSecrets?: readonly string[];
}

/**
 * An `McpServer` whose `registerTool` also takes `requiresSecrets`. Made by `createOdelServer`;
 * it wraps the SDK's own `tools/list` and `tools/call` handlers as they are installed, so the
 * gating rides on public API only.
 */
export class OdelServer extends McpServer {
	private readonly secretGates = new Map<string, readonly string[]>();

	constructor(info: { name: string; version: string }) {
		super(info);
		const protocol = this.server;
		const setRequestHandler = protocol.setRequestHandler.bind(protocol) as (schema: unknown, handler: unknown) => void;
		(protocol as { setRequestHandler: unknown }).setRequestHandler = (schema: unknown, handler: (...args: unknown[]) => unknown) => {
			if (schema === ListToolsRequestSchema) return setRequestHandler(schema, this.gateList(handler));
			if (schema === CallToolRequestSchema) return setRequestHandler(schema, this.gateCall(handler));
			return setRequestHandler(schema, handler);
		};
	}

	override registerTool<OutputArgs extends ZodRawShapeCompat | AnySchema, InputArgs extends undefined | ZodRawShapeCompat | AnySchema = undefined>(
		name: string,
		config: OdelToolConfig<OutputArgs, InputArgs>,
		cb: ToolCallback<InputArgs>
	): RegisteredTool {
		const { requiresSecrets, ...rest } = config;
		if (requiresSecrets?.length) {
			this.secretGates.set(name, [...requiresSecrets]);
			rest._meta = { ...rest._meta, [REQUIRES_SECRETS_META_KEY]: [...requiresSecrets] };
		}
		return super.registerTool(name, rest, cb);
	}

	/** The gated secrets of `tool` the caller lacks; `[]` when it may run (or nothing says otherwise). */
	private missingSecrets(tool: string, extra: HandlerExtraLike | undefined): string[] {
		const required = this.secretGates.get(tool);
		const configured = getConfiguredSecretNames(extra);
		if (!required || configured === null) return [];
		return required.filter(name => !configured.includes(name));
	}

	private gateList(handler: (...args: unknown[]) => unknown) {
		return async (request: unknown, extra: HandlerExtraLike) => {
			const result = (await handler(request, extra)) as { tools: Array<{ name: string }> };
			return { ...result, tools: result.tools.filter(tool => this.missingSecrets(tool.name, extra).length === 0) };
		};
	}

	private gateCall(handler: (...args: unknown[]) => unknown) {
		return async (request: { params: { name: string } }, extra: HandlerExtraLike) => {
			const missing = this.missingSecrets(request.params.name, extra);
			if (missing.length === 0) return handler(request, extra);
			const error = new ModuleError(
				ErrorCode.MISSING_SECRET,
				`Tool "${request.params.name}" needs secrets that are not configured: ${missing.join(', ')}`,
				{ secretName: missing[0], secretNames: missing }
			);
			return { content: [{ type: 'text' as const, text: JSON.stringify(error.toJSON()) }], isError: true };
		};
	}
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
 * server.registerTool('search', { description: '…', requiresSecrets: ['API_KEY'] }, handler);
 * ```
 */
export function createOdelServer(options: CreateOdelServerOptions): OdelServer {
	const server = new OdelServer({ name: options.name, version: options.version });
	registerOdelConfig(server, options.configSchema);
	return server;
}
