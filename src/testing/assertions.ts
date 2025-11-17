/**
 * Test assertion helpers for Odel modules
 */

/**
 * Assert that a result is a success response
 *
 * @param result - Response from tool execution
 * @throws Error if result is not a success response
 *
 * @example
 * ```typescript
 * const result = await testTool(worker, 'add', { a: 1, b: 2 });
 * expectSuccess(result);
 * expect(result.result).toBe(3);
 * ```
 */
export function expectSuccess<T = any>(
	result: any
): asserts result is { success: true } & T {
	if (!result || result.success !== true) {
		throw new Error(
			`Expected success response, got: ${JSON.stringify(result, null, 2)}`
		);
	}
}

/**
 * Assert that a result is an error response
 *
 * @param result - Response from tool execution
 * @param messagePattern - Optional pattern to match against error message
 * @throws Error if result is not an error response or doesn't match pattern
 *
 * @example
 * ```typescript
 * const result = await testTool(worker, 'divide', { a: 1, b: 0 });
 * expectError(result, /cannot divide by zero/i);
 * ```
 */
export function expectError(
	result: any,
	messagePattern?: string | RegExp
): asserts result is { success: false; error: string } {
	if (!result || result.success !== false) {
		throw new Error(
			`Expected error response, got: ${JSON.stringify(result, null, 2)}`
		);
	}

	if (messagePattern) {
		const pattern = typeof messagePattern === 'string'
			? new RegExp(messagePattern, 'i')
			: messagePattern;

		if (!pattern.test(result.error)) {
			throw new Error(
				`Error message "${result.error}" does not match pattern ${pattern}`
			);
		}
	}
}
