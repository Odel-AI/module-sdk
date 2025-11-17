/**
 * MCP Protocol Compliance Tests
 *
 * These tests validate that a module correctly implements the MCP protocol.
 * All modules should use these tests to ensure protocol compliance.
 */

import { describe, it, expect } from 'vitest';
import type { ExecutionContext } from '@cloudflare/workers-types';

export interface MCPTestContext {
	worker: ExportedHandler<any>;
	env: any;
	createExecutionContext: () => ExecutionContext;
	waitOnExecutionContext: (ctx: ExecutionContext) => Promise<void>;
}

/**
 * Standard MCP protocol compliance tests
 *
 * @param getContext - Function that returns test context with worker and environment
 * @param expectedTools - Array of tool names that should be registered
 *
 * @example
 * ```typescript
 * import { testMCPCompliance } from '@odel/module-sdk/testing';
 * import worker from './src/index';
 *
 * testMCPCompliance(
 *   () => ({
 *     worker,
 *     env: {},
 *     createExecutionContext,
 *     waitOnExecutionContext
 *   }),
 *   ['add', 'subtract']
 * );
 * ```
 */
export function testMCPCompliance(
	getContext: () => MCPTestContext,
	expectedTools: string[]
) {
	describe('MCP Protocol Compliance', () => {
		describe('tools/list', () => {
			it('returns valid JSON-RPC response', async () => {
				const { worker, env, createExecutionContext, waitOnExecutionContext } = getContext();
				const request = createMCPRequest('tools/list');
				const ctx = createExecutionContext();
				const response = await worker.fetch!(request as any, env, ctx);
				await waitOnExecutionContext(ctx);

				expect(response.status).toBe(200);
				const result = await response.json() as any;
				expect(result.jsonrpc).toBe('2.0');
				expect(result.id).toBe(1);
				expect(result.result).toBeDefined();
			});

			it('returns all expected tools', async () => {
				const { worker, env, createExecutionContext, waitOnExecutionContext } = getContext();
				const request = createMCPRequest('tools/list');
				const ctx = createExecutionContext();
				const response = await worker.fetch!(request as any, env, ctx);
				await waitOnExecutionContext(ctx);

				const result = await response.json() as any;
				expect(result.result.tools).toBeDefined();
				expect(Array.isArray(result.result.tools)).toBe(true);

				const toolNames = result.result.tools.map((t: any) => t.name);
				expect(toolNames).toEqual(expectedTools);
			});

			it('includes required fields for each tool', async () => {
				const { worker, env, createExecutionContext, waitOnExecutionContext } = getContext();
				const request = createMCPRequest('tools/list');
				const ctx = createExecutionContext();
				const response = await worker.fetch!(request as any, env, ctx);
				await waitOnExecutionContext(ctx);

				const result = await response.json() as any;

				for (const tool of result.result.tools) {
					expect(tool.name).toBeDefined();
					expect(typeof tool.name).toBe('string');
					expect(tool.description).toBeDefined();
					expect(typeof tool.description).toBe('string');
					expect(tool.inputSchema).toBeDefined();
					expect(typeof tool.inputSchema).toBe('object');
				}
			});

			it('supports extended mode with outputSchema', async () => {
				const { worker, env, createExecutionContext, waitOnExecutionContext } = getContext();
				const request = createMCPRequest('tools/list', { extended: true });
				const ctx = createExecutionContext();
				const response = await worker.fetch!(request as any, env, ctx);
				await waitOnExecutionContext(ctx);

				const result = await response.json() as any;

				for (const tool of result.result.tools) {
					expect(tool.outputSchema).toBeDefined();
					expect(typeof tool.outputSchema).toBe('object');
				}
			});

			it('omits outputSchema in standard mode', async () => {
				const { worker, env, createExecutionContext, waitOnExecutionContext } = getContext();
				const request = createMCPRequest('tools/list');
				const ctx = createExecutionContext();
				const response = await worker.fetch!(request as any, env, ctx);
				await waitOnExecutionContext(ctx);

				const result = await response.json() as any;

				for (const tool of result.result.tools) {
					expect(tool.outputSchema).toBeUndefined();
				}
			});
		});

		describe('tools/call', () => {
			it('returns error for unknown tool', async () => {
				const { worker, env, createExecutionContext, waitOnExecutionContext } = getContext();
				const request = createMCPRequest('tools/call', {
					name: 'nonexistent_tool',
					arguments: {}
				});
				const ctx = createExecutionContext();
				const response = await worker.fetch!(request as any, env, ctx);
				await waitOnExecutionContext(ctx);

				const result = await response.json() as any;
				expect(result.error).toBeDefined();
				expect(result.error.code).toBe(-32601);
			});

			it('validates input parameters', async () => {
				const { worker, env, createExecutionContext, waitOnExecutionContext } = getContext();
				const request = createMCPRequest('tools/call', {
					name: expectedTools[0],
					arguments: { invalid: 'params' }
				});
				const ctx = createExecutionContext();
				const response = await worker.fetch!(request as any, env, ctx);
				await waitOnExecutionContext(ctx);

				const result = await response.json() as any;
				// Should either succeed (if invalid params are valid for this tool)
				// or return validation error
				if (result.error) {
					expect(result.error.code).toBe(-32602);
				} else {
					expect(result.result).toBeDefined();
				}
			});
		});

		describe('Unknown methods', () => {
			it('returns error for unknown method', async () => {
				const { worker, env, createExecutionContext, waitOnExecutionContext } = getContext();
				const request = createMCPRequest('unknown/method');
				const ctx = createExecutionContext();
				const response = await worker.fetch!(request as any, env, ctx);
				await waitOnExecutionContext(ctx);

				const result = await response.json() as any;
				expect(result.error).toBeDefined();
				expect(result.error.code).toBe(-32601);
			});
		});

		describe('HTTP methods', () => {
			it('rejects GET requests', async () => {
				const { worker, env, createExecutionContext, waitOnExecutionContext } = getContext();
				const request = new Request('http://example.com', {
					method: 'GET'
				});
				const ctx = createExecutionContext();
				const response = await worker.fetch!(request as any, env, ctx);
				await waitOnExecutionContext(ctx);

				expect(response.status).toBe(405);
			});
		});
	});
}

/**
 * Create a JSON-RPC MCP request
 *
 * @param method - MCP method name (e.g., 'tools/list', 'tools/call')
 * @param params - Optional parameters for the method
 * @param id - Request ID (defaults to 1)
 */
function createMCPRequest(
	method: string,
	params?: Record<string, any>,
	id: number = 1
): Request {
	return new Request('http://example.com', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			jsonrpc: '2.0',
			id,
			method,
			...(params && { params })
		})
	});
}
