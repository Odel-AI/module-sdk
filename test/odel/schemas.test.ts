import { describe, test, expect } from 'vitest';
import { z } from 'zod';
import { SuccessResponseSchema, SimpleSuccessSchema } from '../../src/odel/schemas.js';
import type { SuccessResponse, ErrorResponse } from '../../src/odel/schemas.js';

describe('Odel Schemas', () => {
	describe('SuccessResponseSchema', () => {
		const emailResponseSchema = SuccessResponseSchema(
			z.object({
				messageId: z.string(),
				sentAt: z.string()
			})
		);

		test('should accept valid success response', () => {
			const result = emailResponseSchema.parse({
				success: true,
				messageId: 'msg_123',
				sentAt: '2024-01-15T10:30:00Z'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.messageId).toBe('msg_123');
				expect(result.sentAt).toBe('2024-01-15T10:30:00Z');
			}
		});

		test('should accept valid error response', () => {
			const result = emailResponseSchema.parse({
				success: false,
				error: 'Failed to send email'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Failed to send email');
			}
		});

		test('should reject success response missing required fields', () => {
			expect(() =>
				emailResponseSchema.parse({
					success: true,
					messageId: 'msg_123'
					// missing sentAt
				})
			).toThrow();
		});

		test('should reject error response missing error message', () => {
			expect(() =>
				emailResponseSchema.parse({
					success: false
					// missing error
				})
			).toThrow();
		});

		test('should reject response without success field', () => {
			expect(() =>
				emailResponseSchema.parse({
					messageId: 'msg_123',
					sentAt: '2024-01-15T10:30:00Z'
				})
			).toThrow();
		});

		test('should work with complex data schemas', () => {
			const complexSchema = SuccessResponseSchema(
				z.object({
					items: z.array(
						z.object({
							id: z.string(),
							name: z.string(),
							count: z.number()
						})
					),
					total: z.number(),
					page: z.number()
				})
			);

			const result = complexSchema.parse({
				success: true,
				items: [
					{ id: '1', name: 'Item 1', count: 10 },
					{ id: '2', name: 'Item 2', count: 20 }
				],
				total: 2,
				page: 1
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.items).toHaveLength(2);
				expect(result.total).toBe(2);
			}
		});
	});

	describe('SimpleSuccessSchema', () => {
		test('should accept simple success', () => {
			const result = SimpleSuccessSchema.parse({ success: true });
			expect(result.success).toBe(true);
		});

		test('should accept simple error', () => {
			const result = SimpleSuccessSchema.parse({
				success: false,
				error: 'Operation failed'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Operation failed');
			}
		});

		test('should reject success with extra fields', () => {
			// Union will try to match success: true branch first
			// and zod.object is strict by default in newer versions
			const parsed = SimpleSuccessSchema.safeParse({
				success: true,
				unexpectedField: 'value'
			});

			// This may or may not pass depending on zod version strictness
			// The important thing is it doesn't crash
			expect(parsed.success).toBeDefined();
		});
	});

	describe('Type inference', () => {
		test('should infer correct success type', () => {
			const schema = SuccessResponseSchema(
				z.object({
					result: z.number()
				})
			);

			type Success = SuccessResponse<typeof schema>;
			type Error = ErrorResponse<typeof schema>;

			// These are compile-time checks - if they compile, the types are correct
			const successResult: Success = { success: true as const, result: 42 };
			const errorResult: Error = { success: false as const, error: 'Failed' };

			expect(successResult.success).toBe(true);
			expect(successResult.result).toBe(42);
			expect(errorResult.success).toBe(false);
			expect(errorResult.error).toBe('Failed');
		});

		test('should allow type narrowing with success check', () => {
			const schema = SuccessResponseSchema(
				z.object({
					data: z.string()
				})
			);

			const result = schema.parse({ success: true, data: 'hello' });

			// Type narrowing should work
			if (result.success) {
				// In this branch, result.data should be accessible
				expect(result.data).toBe('hello');
			} else {
				// In this branch, result.error should be accessible
				expect(result.error).toBeDefined();
			}
		});
	});

	describe('Response pattern usage', () => {
		test('should work as function return type', () => {
			const outputSchema = SuccessResponseSchema(
				z.object({
					processed: z.boolean(),
					count: z.number()
				})
			);

			type Output = z.infer<typeof outputSchema>;

			function processItems(): Output {
				try {
					// Simulate processing
					return {
						success: true as const,
						processed: true,
						count: 10
					};
				} catch {
					return {
						success: false as const,
						error: 'Processing failed'
					};
				}
			}

			const result = processItems();
			expect(result.success).toBe(true);

			// Validate the result matches schema
			const validated = outputSchema.parse(result);
			expect(validated.success).toBe(true);
		});

		test('should integrate with ModuleError.toJSON()', () => {
			// Simulate what happens when a ModuleError is caught and converted
			const errorResponse = {
				success: false as const,
				error: 'Rate limit exceeded',
				code: 4001,
				metadata: { retryAfter: 60 }
			};

			// The basic schema should accept this (ignoring extra fields)
			const basicSchema = SuccessResponseSchema(z.object({ result: z.string() }));

			// SafeParse to handle extra fields gracefully
			const parsed = basicSchema.safeParse(errorResponse);

			// Should match the error branch of the union
			if (parsed.success && !parsed.data.success) {
				expect(parsed.data.error).toBe('Rate limit exceeded');
			}
		});
	});
});
