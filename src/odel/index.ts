/**
 * Odel module helpers — the additive surface on top of the official MCP SDK.
 *
 * Context/secret extraction, typed errors, validators, response schemas, and
 * code-declared config. Re-exported from the package root, and also available
 * directly via `@odel/module-sdk/odel`.
 */

// Identity context
export { DEFAULT_MODULE_CONTEXT } from './types.js';
export type { ModuleContext, ToolContext } from './types.js';

// Error handling
export { ErrorCode, ModuleError } from './errors.js';

// Input validators
export { validators } from './validators.js';

// Response schemas
export { SimpleSuccessSchema, SuccessResponseSchema } from './schemas.js';
export type { ErrorResponse, SuccessResponse } from './schemas.js';

// Context & secret extraction (reads the handler's `extra._meta`)
export {
	CONTEXT_META_KEY,
	SECRETS_META_KEY,
	createToolContext,
	getModuleContext,
	getOptionalSecret,
	getRequiredSecret
} from './context.js';
export type { HandlerExtraLike } from './context.js';

// Code-declared config (Zod configSchema)
export { ODEL_CONFIG_URI, buildConfigManifest, configRequiredSecretNames, parseConfig, registerOdelConfig } from './config.js';
export type { ConfigSchema, DeclaredSecret } from './config.js';
