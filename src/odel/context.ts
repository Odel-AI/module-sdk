/**
 * Context & secret extraction for Odel modules
 *
 * mcp-proxy injects per-user data into the JSON-RPC request `params._meta`
 * under namespaced keys. The official MCP SDK surfaces `params._meta` to tool
 * handlers as `extra._meta`, so modules read Odel context from there — never
 * from the raw request body.
 *
 * Envelope:
 * - `_meta["app.odel/context"]` — identity (userId, displayName, …)
 * - `_meta["app.odel/secrets"]` — per-user secret map for this module
 */

import { DEFAULT_MODULE_CONTEXT, type ModuleContext, type ToolContext } from './types.js';
import { ModuleError } from './errors.js';

/** `_meta` key carrying Odel identity context. Reverse-DNS of `odel.app`. */
export const CONTEXT_META_KEY = 'app.odel/context';
/** `_meta` key carrying the per-user secret map for this module. */
export const SECRETS_META_KEY = 'app.odel/secrets';

/**
 * Minimal structural view of the official SDK's `RequestHandlerExtra`.
 *
 * We only ever read `_meta`, so accepting this loose shape lets handlers pass
 * the SDK's `extra` straight through without wrestling with its generics.
 */
export interface HandlerExtraLike {
	_meta?: unknown;
}

/** Internal typed view of the Odel-namespaced keys inside `_meta`. */
interface OdelMeta {
	'app.odel/context'?: Partial<ModuleContext>;
	'app.odel/secrets'?: Record<string, string>;
}

function readMeta(extra: HandlerExtraLike | undefined): OdelMeta {
	return ((extra?._meta as OdelMeta | undefined) ?? {}) as OdelMeta;
}

/**
 * Read the Odel identity context from a tool handler's `extra`.
 *
 * Falls back to anonymous defaults (with a fresh `timestamp`/`requestId`) when
 * no Odel context is present — e.g. direct/anonymous access or local testing.
 *
 * @example
 * ```typescript
 * server.registerTool('whoami', { ... }, async (_args, extra) => {
 *   const ctx = getModuleContext(extra);
 *   return { content: [{ type: 'text', text: ctx.userId }] };
 * });
 * ```
 */
export function getModuleContext(extra: HandlerExtraLike): ModuleContext {
	const ctx = readMeta(extra)[CONTEXT_META_KEY];
	if (!ctx) {
		return {
			...DEFAULT_MODULE_CONTEXT,
			timestamp: Date.now(),
			requestId: crypto.randomUUID()
		};
	}
	return {
		userId: ctx.userId ?? DEFAULT_MODULE_CONTEXT.userId,
		conversationId: ctx.conversationId,
		displayName: ctx.displayName ?? DEFAULT_MODULE_CONTEXT.displayName,
		timestamp: ctx.timestamp ?? Date.now(),
		requestId: ctx.requestId ?? crypto.randomUUID()
	};
}

/**
 * Bundle the identity context with Worker env bindings into a `ToolContext`.
 *
 * @example
 * ```typescript
 * const ctx = createToolContext<MyEnv>(extra, env);
 * await ctx.env.MY_KV.put(ctx.userId, '1');
 * ```
 */
export function createToolContext<Env>(extra: HandlerExtraLike, env: Env): ToolContext<Env> {
	return { ...getModuleContext(extra), env };
}

/**
 * Read a required secret from the Odel secrets envelope.
 *
 * @throws {ModuleError} `MISSING_SECRET` if the secret is absent or empty.
 *
 * @example
 * ```typescript
 * const apiKey = getRequiredSecret(extra, 'RESEND_API_KEY');
 * ```
 */
export function getRequiredSecret(extra: HandlerExtraLike, name: string): string {
	const value = readMeta(extra)[SECRETS_META_KEY]?.[name];
	if (!value) {
		throw ModuleError.missingSecret(name);
	}
	return value;
}

/**
 * Read an optional secret from the Odel secrets envelope.
 *
 * @returns the secret value, or `undefined` if not configured.
 */
export function getOptionalSecret(extra: HandlerExtraLike, name: string): string | undefined {
	return readMeta(extra)[SECRETS_META_KEY]?.[name];
}
