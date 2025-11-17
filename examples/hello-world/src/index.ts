/**
 * Simple Hello World Module
 *
 * Demonstrates how to create a basic Odel module that uses context information
 * provided by mcp-proxy (userId, displayName, etc.)
 */

import { createModule, SuccessResponseSchema } from '@odel/module-sdk';
import { z } from 'zod';

export default createModule()
	.tool({
		name: 'greet_me',
		description: 'Returns a personalized greeting using the user ID from context',

		// No input parameters needed - we'll use context.userId
		inputSchema: z.object({}),

		// Output includes the greeting message
		outputSchema: SuccessResponseSchema(
			z.object({
				message: z.string().describe('Personalized greeting message')
			})
		),

		// Handler receives empty input and context from mcp-proxy
		handler: async (_input, context) => {
			// context.userId is provided by mcp-proxy
			// It's a hashed user ID for privacy

			return {
				success: true as const,
				message: `Hello ${context.userId}`
			};
		}
	})
	.build();
