/**
 * Testing utilities for Odel modules
 *
 * @example
 * ```typescript
 * import { testMCPCompliance, testTool, expectSuccess } from '@odel/module-sdk/testing';
 * ```
 */

export { testMCPCompliance } from './mcp-compliance';
export type { MCPTestContext } from './mcp-compliance';
export { expectSuccess, expectError } from './assertions';

/**
 * Create a JSON-RPC MCP request
 *
 * @param method - MCP method name (e.g., 'tools/list', 'tools/call')
 * @param params - Optional parameters for the method
 * @param id - Request ID (defaults to current timestamp)
 *
 * @example
 * ```typescript
 * const request = createMCPRequest('tools/list', { extended: true });
 * const response = await worker.fetch(request, env, ctx);
 * ```
 */
export function createMCPRequest(
	method: string,
	params?: Record<string, any>,
	id?: number
): Request {
	return new Request('http://test', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: id ?? Date.now(),
			method,
			...(params && { params })
		})
	});
}

/**
 * Test a tool by calling it with given input
 *
 * @param worker - The module's ExportedHandler
 * @param toolName - Name of the tool to test
 * @param input - Input parameters for the tool
 * @param options - Optional configuration
 * @returns The parsed tool response
 *
 * @example
 * ```typescript
 * import { testTool, expectSuccess } from '@odel/module-sdk/testing';
 * import worker from './src/index';
 *
 * test('add tool works', async () => {
 *   const result = await testTool(worker, 'add', { a: 1, b: 2 });
 *   expectSuccess(result);
 *   expect(result.result).toBe(3);
 * });
 * ```
 */
export async function testTool<T = any>(
	worker: ExportedHandler<any>,
	toolName: string,
	input: Record<string, unknown>,
	options?: {
		env?: any;
		context?: {
			userId?: string;
			conversationId?: string;
			displayName?: string;
			secrets?: Record<string, string>;
			timestamp?: number;
			requestId?: string;
		};
	}
): Promise<T> {
	// Build the base request body
	const requestBody: any = {
		jsonrpc: '2.0',
		id: Date.now(),
		method: 'tools/call',
		params: {
			name: toolName,
			arguments: input
		}
	};

	// Add context at the top level (not in params) if provided
	if (options?.context) {
		requestBody.context = {
			userId: options.context.userId || 'test-user',
			conversationId: options.context.conversationId,
			displayName: options.context.displayName || 'Test User',
			timestamp: options.context.timestamp || Date.now(),
			requestId: options.context.requestId || crypto.randomUUID(),
			secrets: options.context.secrets || {}
		};
	}

	const request = new Request('http://test', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(requestBody)
	});

	// Import Cloudflare test utilities - these are only available in test environment
	const { createExecutionContext, waitOnExecutionContext } = await import('cloudflare:test') as any;
	const ctx = createExecutionContext();
	const response = await worker.fetch!(request as any, options?.env || {}, ctx);
	await waitOnExecutionContext(ctx);

	const result = await response.json() as any;

	// Check for JSON-RPC error
	if (result.error) {
		throw new Error(
			`Tool execution failed: ${result.error.message}` +
			(result.error.data ? `\n${JSON.stringify(result.error.data, null, 2)}` : '')
		);
	}

	// Extract tool response from MCP envelope
	if (result.result?.content?.[0]?.text) {
		return JSON.parse(result.result.content[0].text);
	}

	throw new Error('Invalid MCP response format');
}
