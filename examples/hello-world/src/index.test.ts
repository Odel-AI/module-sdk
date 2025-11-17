/**
 * Tests for hello-world module
 */

import { describe, it, expect } from 'vitest';
import { testMCPCompliance, testTool, expectSuccess } from '@odel/module-sdk/testing';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from './index';

// Test MCP protocol compliance
testMCPCompliance(
	() => ({ worker, env, createExecutionContext, waitOnExecutionContext }),
	['greet_me'] // Expected tools
);

// Test the greet_me tool
describe('greet_me tool', () => {
	it('returns greeting with user ID from context', async () => {
		const result = await testTool(
			worker,
			'greet_me',
			{}, // No input needed
			{
				env,
				context: {
					userId: 'user-123-hashed',
					displayName: 'Test User'
				}
			}
		);

		expectSuccess(result);
		expect(result.message).toBe('Hello user-123-hashed');
	});

	it('uses default anonymous user when no context provided', async () => {
		const result = await testTool(
			worker,
			'greet_me',
			{},
			{ env } // No context provided
		);

		expectSuccess(result);
		expect(result.message).toBe('Hello anonymous');
	});
});
