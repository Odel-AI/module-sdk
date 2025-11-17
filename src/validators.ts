/**
 * Common Zod validators for Odel modules
 */

import { z } from 'zod';

/**
 * Collection of reusable Zod validators for common input types
 */
export const validators = {
	/**
	 * Email address validation
	 * @example z.object({ email: validators.email() })
	 */
	email: () => z.string().email(),

	/**
	 * Comma-separated email list - accepts array or comma-separated string
	 * @example validators.emailList() // Accepts "a@example.com,b@example.com" or ["a@example.com", "b@example.com"]
	 */
	emailList: () =>
		z.array(z.string().email()).or(
			z.string().transform(s => s.split(',').map(e => e.trim())).pipe(z.array(z.string().email()))
		),

	/**
	 * URL validation (http or https)
	 * @example validators.url()
	 */
	url: () => z.string().url(),

	/**
	 * HTTPS-only URL validation
	 * @example validators.httpsUrl()
	 */
	httpsUrl: () =>
		z.string().url().refine(url => url.startsWith('https://'), {
			message: 'URL must use HTTPS'
		}),

	/**
	 * API key validation with optional prefix requirement
	 * @param prefix - Optional prefix (e.g., "sk-" for OpenAI keys)
	 * @example validators.apiKey('sk-')
	 */
	apiKey: (prefix?: string) => {
		const base = z.string().min(10, 'API key must be at least 10 characters');
		return prefix
			? base.refine(key => key.startsWith(prefix), {
					message: `API key must start with ${prefix}`
			  })
			: base;
	},

	/**
	 * JSON string parser - transforms JSON string to parsed object
	 * @example validators.json<MyType>()
	 */
	json: <T = any>() =>
		z.string().transform((str, ctx): T => {
			try {
				return JSON.parse(str);
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
	 * @example validators.nonEmptyString()
	 */
	nonEmptyString: () => z.string().min(1, 'String cannot be empty'),

	/**
	 * Positive integer validation
	 * @example validators.positiveInt()
	 */
	positiveInt: () => z.number().int().positive(),

	/**
	 * Port number validation (1-65535)
	 * @example validators.port()
	 */
	port: () => z.number().int().min(1).max(65535),

	/**
	 * ISO 8601 date string validation
	 * @example validators.isoDate()
	 */
	isoDate: () => z.string().datetime(),

	/**
	 * UUID validation
	 * @example validators.uuid()
	 */
	uuid: () => z.string().uuid(),

	/**
	 * Enum from array of strings
	 * @param values - Array of allowed values
	 * @example validators.enumFrom(['draft', 'published', 'archived'])
	 */
	enumFrom: <T extends string>(values: readonly [T, ...T[]]) => z.enum(values)
};
