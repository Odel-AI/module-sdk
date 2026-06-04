/**
 * Type definitions for Odel modules
 *
 * These types define the per-request context passed to module handlers,
 * containing user/request identity. Secrets are delivered separately (see
 * `getRequiredSecret` / `parseConfig`), not on the context object.
 */

/**
 * Per-request identity context for module handlers
 *
 * Injected by mcp-proxy into the JSON-RPC request at
 * `params._meta["app.odel/context"]` and read via `getModuleContext(extra)`.
 *
 * Note: secrets are NOT part of this object — they ride in a separate
 * envelope key (`app.odel/secrets`) and are read with `getRequiredSecret` /
 * `getOptionalSecret` / `parseConfig`, so identity context can be logged
 * while secrets stay out of logs.
 */
export interface ModuleContext {
	/** Hashed user ID (privacy-preserving, consistent per user) */
	userId: string;
	/** Hashed conversation ID (optional, for multi-turn context) */
	conversationId?: string;
	/** User's display name */
	displayName?: string;
	/** Unix timestamp in milliseconds when request was made */
	timestamp: number;
	/** UUID for request tracing and logging */
	requestId: string;
}

/**
 * Identity context bundled with Cloudflare Worker environment bindings
 *
 * @typeParam Env - Worker bindings type (KV, D1, R2, etc.)
 *
 * @example
 * ```typescript
 * interface MyEnv {
 *   ANALYTICS: AnalyticsEngine;
 *   MY_KV: KVNamespace;
 * }
 *
 * const ctx = createToolContext<MyEnv>(extra, env);
 * console.log(ctx.userId);          // identity
 * await ctx.env.MY_KV.put('k', 'v'); // typed Worker bindings
 * ```
 */
export interface ToolContext<Env = unknown> extends ModuleContext {
	/** Cloudflare Worker environment bindings */
	env: Env;
}

/**
 * Default context values used when no Odel context is present
 * (e.g. direct/anonymous MCP access or local testing).
 *
 * `timestamp` and `requestId` here are placeholders — `getModuleContext`
 * substitutes a fresh `Date.now()` / `crypto.randomUUID()` per call.
 */
export const DEFAULT_MODULE_CONTEXT: ModuleContext = {
	userId: 'anonymous',
	displayName: 'Anonymous User',
	timestamp: 0,
	requestId: 'no-request-id'
};
