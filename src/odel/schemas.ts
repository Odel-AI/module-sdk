/**
 * Schema utilities for Odel modules
 *
 * Provides helpers for creating standardized response schemas.
 */

import { z } from 'zod';

/**
 * Standard success/error response wrapper
 *
 * Creates a union type that supports either:
 * - `{ success: true, ...customFields }` for successful responses
 * - `{ success: false, error: string }` for error responses
 *
 * This provides a consistent response format across all module tools,
 * making it easy for clients to handle both success and error cases.
 *
 * @param dataSchema - Zod object schema for the success response data
 * @returns Union schema of success and error responses
 *
 * @example
 * ```typescript
 * import { SuccessResponseSchema } from '@odel/module-sdk';
 *
 * const outputSchema = SuccessResponseSchema(
 *   z.object({
 *     messageId: z.string(),
 *     sentAt: z.string(),
 *   })
 * );
 *
 * // Valid success response:
 * { success: true, messageId: 'msg_123', sentAt: '2024-01-15T10:30:00Z' }
 *
 * // Valid error response:
 * { success: false, error: 'Failed to send email' }
 * ```
 *
 * @remarks
 * When returning from handlers, use `as const` on the success literal
 * for proper TypeScript type narrowing:
 *
 * ```typescript
 * // Good - TypeScript knows this is a success response
 * return { success: true as const, messageId: 'msg_123', sentAt: now };
 *
 * // Good - TypeScript knows this is an error response
 * return { success: false as const, error: 'Something went wrong' };
 * ```
 */
export const SuccessResponseSchema = <T extends z.ZodRawShape>(dataSchema: z.ZodObject<T>) =>
	z.union([
		z.object({
			success: z.literal(true),
			...dataSchema.shape
		}),
		z.object({
			success: z.literal(false),
			error: z.string()
		})
	]);

/**
 * Type helper to extract the success response type from a SuccessResponseSchema
 *
 * @example
 * ```typescript
 * const outputSchema = SuccessResponseSchema(z.object({ result: z.number() }));
 * type Output = z.infer<typeof outputSchema>;
 * // Output = { success: true; result: number } | { success: false; error: string }
 *
 * type SuccessOutput = SuccessResponse<typeof outputSchema>;
 * // SuccessOutput = { success: true; result: number }
 * ```
 */
export type SuccessResponse<T extends z.ZodTypeAny> = Extract<z.infer<T>, { success: true }>;

/**
 * Type helper to extract the error response type from a SuccessResponseSchema
 *
 * @example
 * ```typescript
 * const outputSchema = SuccessResponseSchema(z.object({ result: z.number() }));
 *
 * type ErrorOutput = ErrorResponse<typeof outputSchema>;
 * // ErrorOutput = { success: false; error: string }
 * ```
 */
export type ErrorResponse<T extends z.ZodTypeAny> = Extract<z.infer<T>, { success: false }>;

/**
 * Simple success response schema (no additional data)
 *
 * Use this when a tool only needs to indicate success/failure
 * without returning additional data.
 *
 * @example
 * ```typescript
 * const outputSchema = SimpleSuccessSchema;
 *
 * // Success: { success: true }
 * // Error: { success: false, error: 'Something went wrong' }
 * ```
 */
export const SimpleSuccessSchema = z.union([
	z.object({ success: z.literal(true) }),
	z.object({ success: z.literal(false), error: z.string() })
]);
