/**
 * Type definitions for Odel modules
 */

import { z } from 'zod';

/**
 * Tool definition with Zod schema
 */
export interface ModuleTool<TInput extends z.ZodType, TOutput extends z.ZodType> {
	name: string;
	description: string;
	inputSchema: TInput;
	outputSchema: TOutput;
	handler: (input: z.infer<TInput>, context: ToolContext) => Promise<z.infer<TOutput>>;
}

/**
 * Context provided to tool handlers - basic user/request info
 */
export interface ModuleContext {
	userId: string;              // Hashed user ID
	conversationId?: string;     // Hashed conversation ID
	displayName: string;         // User's display name
	timestamp: number;           // Unix timestamp (milliseconds)
	requestId: string;           // UUID for this request
	secrets: Record<string, string>;  // Decrypted user secrets
}

/**
 * Extended context with Cloudflare Worker environment bindings
 */
export interface ToolContext<Env = any> extends ModuleContext {
	env: Env;  // Worker bindings (API keys, databases, etc.)
}
