/**
 * Common Zod validators for Odel modules
 *
 * Provides reusable validators for common input types like
 * emails, URLs, API keys, and more.
 */

import { z } from 'zod';

/**
 * Collection of reusable Zod validators for common input types
 *
 * @example
 * ```typescript
 * import { validators } from '@odel/module-sdk';
 *
 * const inputSchema = z.object({
 *   email: validators.email(),
 *   recipients: validators.emailList(),
 *   webhookUrl: validators.httpsUrl(),
 *   apiKey: validators.apiKey('sk-'),
 * });
 * ```
 */
export const validators = {
	/**
	 * Email address validation
	 *
	 * @example
	 * ```typescript
	 * z.object({ email: validators.email() })
	 * ```
	 */
	email: () => z.string().email(),

	/**
	 * Comma-separated email list - accepts array or comma-separated string
	 *
	 * @example
	 * ```typescript
	 * validators.emailList()
	 * // Accepts: "a@example.com,b@example.com"
	 * // Accepts: ["a@example.com", "b@example.com"]
	 * // Returns: ["a@example.com", "b@example.com"]
	 * ```
	 */
	emailList: () =>
		z.array(z.string().email()).or(
			z
				.string()
				.transform(s => s.split(',').map(e => e.trim()))
				.pipe(z.array(z.string().email()))
		),

	/**
	 * URL validation (http or https)
	 *
	 * @example
	 * ```typescript
	 * validators.url()
	 * ```
	 */
	url: () => z.string().url(),

	/**
	 * HTTPS-only URL validation
	 *
	 * @example
	 * ```typescript
	 * validators.httpsUrl()
	 * ```
	 */
	httpsUrl: () =>
		z
			.string()
			.url()
			.refine(url => url.startsWith('https://'), {
				message: 'URL must use HTTPS'
			}),

	/**
	 * API key validation with optional prefix requirement
	 *
	 * @param prefix - Optional required prefix (e.g., "sk-" for OpenAI keys)
	 *
	 * @example
	 * ```typescript
	 * validators.apiKey()        // Any key >= 10 chars
	 * validators.apiKey('sk-')   // Must start with "sk-"
	 * validators.apiKey('re_')   // Must start with "re_" (Resend)
	 * ```
	 */
	apiKey: (prefix?: string) => {
		const base = z.string().min(10, 'API key must be at least 10 characters');
		return prefix
			? base.refine(key => key.startsWith(prefix), {
					message: `API key must start with "${prefix}"`
				})
			: base;
	},

	/**
	 * JSON string parser - transforms JSON string to parsed object
	 *
	 * @typeParam T - Expected parsed type
	 *
	 * @example
	 * ```typescript
	 * validators.json<{ items: string[] }>()
	 * // Input: '{"items":["a","b"]}'
	 * // Output: { items: ["a", "b"] }
	 * ```
	 */
	json: <T = unknown>() =>
		z.string().transform((str, ctx): T => {
			try {
				return JSON.parse(str) as T;
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid JSON'
				});
				return z.NEVER;
			}
		}),

	/**
	 * Non-empty string validation
	 *
	 * @example
	 * ```typescript
	 * validators.nonEmptyString()
	 * ```
	 */
	nonEmptyString: () => z.string().min(1, 'String cannot be empty'),

	/**
	 * Positive integer validation (> 0)
	 *
	 * @example
	 * ```typescript
	 * validators.positiveInt()
	 * ```
	 */
	positiveInt: () => z.number().int().positive(),

	/**
	 * Non-negative integer validation (>= 0)
	 *
	 * @example
	 * ```typescript
	 * validators.nonNegativeInt()
	 * ```
	 */
	nonNegativeInt: () => z.number().int().nonnegative(),

	/**
	 * Port number validation (1-65535)
	 *
	 * @example
	 * ```typescript
	 * validators.port()
	 * ```
	 */
	port: () => z.number().int().min(1).max(65535),

	/**
	 * ISO 8601 date string validation
	 *
	 * @example
	 * ```typescript
	 * validators.isoDate()
	 * // Accepts: "2024-01-15T10:30:00Z"
	 * ```
	 */
	isoDate: () => z.string().datetime(),

	/**
	 * UUID validation (v4 format)
	 *
	 * @example
	 * ```typescript
	 * validators.uuid()
	 * ```
	 */
	uuid: () => z.string().uuid(),

	/**
	 * Enum from array of strings
	 *
	 * @param values - Array of allowed values (must have at least one)
	 *
	 * @example
	 * ```typescript
	 * validators.enumFrom(['draft', 'published', 'archived'] as const)
	 * ```
	 */
	enumFrom: <T extends string>(values: readonly [T, ...T[]]) => z.enum(values),

	/**
	 * Optional string that transforms empty strings to undefined
	 *
	 * @example
	 * ```typescript
	 * validators.optionalString()
	 * // Input: "" -> Output: undefined
	 * // Input: "hello" -> Output: "hello"
	 * ```
	 */
	optionalString: () =>
		z
			.string()
			.optional()
			.transform(val => (val === '' ? undefined : val)),

	/**
	 * Trimmed non-empty string
	 *
	 * @example
	 * ```typescript
	 * validators.trimmedString()
	 * // Input: "  hello  " -> Output: "hello"
	 * // Input: "   " -> Error: String cannot be empty
	 * ```
	 */
	trimmedString: () => z.string().trim().min(1, 'String cannot be empty'),

	/**
	 * Bounded string with min/max length
	 *
	 * @param min - Minimum length
	 * @param max - Maximum length
	 *
	 * @example
	 * ```typescript
	 * validators.boundedString(1, 1000)  // For subject lines
	 * validators.boundedString(10, 50000) // For email body
	 * ```
	 */
	boundedString: (min: number, max: number) => z.string().min(min).max(max)
};
