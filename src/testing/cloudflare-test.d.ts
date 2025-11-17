/**
 * Type declarations for cloudflare:test module
 * This module is only available in Cloudflare Workers test environment
 */

declare module 'cloudflare:test' {
	import type { ExecutionContext } from '@cloudflare/workers-types';

	export function createExecutionContext(): ExecutionContext;
	export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
}
