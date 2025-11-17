/**
 * Schema utilities for Odel modules
 */

import { z } from 'zod';

/**
 * Standard success/error response wrapper
 *
 * Creates a union type that supports either:
 * - { success: true, ...customFields } for successful responses
 * - { success: false, error: string } for error responses
 *
 * @example
 * ```typescript
 * const outputSchema = SuccessResponseSchema(
 *   z.object({
 *     result: z.number()
 *   })
 * );
 *
 * // Valid responses:
 * { success: true, result: 42 }
 * { success: false, error: "Something went wrong" }
 * ```
 *
 * Note: Use `as const` on the success literal for proper type discrimination:
 * ```typescript
 * return { success: true as const, result: 42 };
 * return { success: false as const, error: "Error message" };
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
