/**
 * Standardized error handling for Odel modules
 *
 * Provides structured error codes and a ModuleError class
 * for consistent error responses across all modules.
 */

/**
 * Error codes for module operations, organized by category
 *
 * - 1xxx: Validation errors
 * - 2xxx: Authentication/secrets errors
 * - 3xxx: External API errors
 * - 4xxx: Rate limiting errors
 * - 5xxx: Internal errors
 */
export enum ErrorCode {
	// Validation errors (1xxx)
	INVALID_INPUT = 1001,
	MISSING_REQUIRED_FIELD = 1002,
	INVALID_FORMAT = 1003,

	// Authentication/secrets (2xxx)
	MISSING_SECRET = 2001,
	INVALID_SECRET = 2002,
	UNAUTHORIZED = 2003,

	// External API errors (3xxx)
	API_ERROR = 3001,
	NETWORK_ERROR = 3002,
	TIMEOUT = 3003,
	NOT_FOUND = 3004,

	// Rate limiting (4xxx)
	RATE_LIMIT_EXCEEDED = 4001,
	QUOTA_EXCEEDED = 4002,

	// Internal errors (5xxx)
	INTERNAL_ERROR = 5001,
	NOT_IMPLEMENTED = 5002,
	CONFIGURATION_ERROR = 5003
}

/**
 * Standardized module error class
 *
 * Use this class to throw structured errors from module handlers.
 * The error will be properly serialized in the MCP response.
 *
 * @example
 * ```typescript
 * // Using static factory methods (recommended)
 * throw ModuleError.missingSecret('RESEND_API_KEY');
 * throw ModuleError.apiError('Failed to send email', { statusCode: 500 });
 * throw ModuleError.rateLimitError(60);
 *
 * // Using constructor directly
 * throw new ModuleError(
 *   ErrorCode.INVALID_INPUT,
 *   'Email address is invalid',
 *   { field: 'email', value: input.email }
 * );
 * ```
 */
export class ModuleError extends Error {
	/**
	 * Create a new module error
	 *
	 * @param code - Error code from ErrorCode enum
	 * @param message - Human-readable error message
	 * @param metadata - Optional additional error context
	 */
	constructor(
		public readonly code: ErrorCode,
		message: string,
		public readonly metadata?: Record<string, unknown>
	) {
		super(message);
		this.name = 'ModuleError';

		// Maintains proper stack trace for where error was thrown (only available on V8)
		if (
			typeof (Error as typeof globalThis.Error & { captureStackTrace?: (target: object, constructor: unknown) => void })
				.captureStackTrace === 'function'
		) {
			(Error as typeof globalThis.Error & { captureStackTrace: (target: object, constructor: unknown) => void }).captureStackTrace(
				this,
				ModuleError
			);
		}
	}

	/**
	 * Convert error to JSON response format
	 *
	 * @returns Structured error response object
	 */
	toJSON(): {
		success: false;
		error: string;
		code: ErrorCode;
		metadata?: Record<string, unknown>;
	} {
		return {
			success: false as const,
			error: this.message,
			code: this.code,
			...(this.metadata && { metadata: this.metadata })
		};
	}

	/**
	 * Create a validation error
	 *
	 * @param message - Description of what's invalid
	 * @param metadata - Optional context (field name, value, etc.)
	 */
	static validationError(message: string, metadata?: Record<string, unknown>): ModuleError {
		return new ModuleError(ErrorCode.INVALID_INPUT, message, metadata);
	}

	/**
	 * Create a missing required field error
	 *
	 * @param fieldName - Name of the missing field
	 */
	static missingField(fieldName: string): ModuleError {
		return new ModuleError(ErrorCode.MISSING_REQUIRED_FIELD, `Required field "${fieldName}" is missing`, { field: fieldName });
	}

	/**
	 * Create a missing secret error
	 *
	 * @param secretName - Name of the required secret
	 */
	static missingSecret(secretName: string): ModuleError {
		return new ModuleError(ErrorCode.MISSING_SECRET, `Required secret "${secretName}" is not configured`, { secretName });
	}

	/**
	 * Create an invalid secret error
	 *
	 * @param secretName - Name of the invalid secret
	 * @param reason - Why the secret is invalid
	 */
	static invalidSecret(secretName: string, reason?: string): ModuleError {
		const message = reason ? `Secret "${secretName}" is invalid: ${reason}` : `Secret "${secretName}" is invalid`;
		return new ModuleError(ErrorCode.INVALID_SECRET, message, { secretName });
	}

	/**
	 * Create an external API error
	 *
	 * @param message - Description of the API error
	 * @param metadata - Optional context (status code, response, etc.)
	 */
	static apiError(message: string, metadata?: Record<string, unknown>): ModuleError {
		return new ModuleError(ErrorCode.API_ERROR, message, metadata);
	}

	/**
	 * Create a network error
	 *
	 * @param message - Description of the network issue
	 * @param metadata - Optional context (URL, error details, etc.)
	 */
	static networkError(message: string, metadata?: Record<string, unknown>): ModuleError {
		return new ModuleError(ErrorCode.NETWORK_ERROR, message, metadata);
	}

	/**
	 * Create a timeout error
	 *
	 * @param operation - What operation timed out
	 * @param timeoutMs - Timeout duration in milliseconds
	 */
	static timeout(operation: string, timeoutMs?: number): ModuleError {
		return new ModuleError(ErrorCode.TIMEOUT, `Operation "${operation}" timed out`, timeoutMs ? { timeoutMs } : undefined);
	}

	/**
	 * Create a not found error
	 *
	 * @param resource - What resource was not found
	 * @param identifier - Optional identifier that was searched for
	 */
	static notFound(resource: string, identifier?: string): ModuleError {
		const message = identifier ? `${resource} "${identifier}" not found` : `${resource} not found`;
		return new ModuleError(ErrorCode.NOT_FOUND, message, identifier ? { identifier } : undefined);
	}

	/**
	 * Create a rate limit error
	 *
	 * @param retryAfter - Optional seconds until retry is allowed
	 */
	static rateLimitError(retryAfter?: number): ModuleError {
		return new ModuleError(ErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded', retryAfter ? { retryAfter } : undefined);
	}

	/**
	 * Create a quota exceeded error
	 *
	 * @param quotaType - Type of quota exceeded (e.g., "API calls", "storage")
	 */
	static quotaExceeded(quotaType?: string): ModuleError {
		const message = quotaType ? `${quotaType} quota exceeded` : 'Quota exceeded';
		return new ModuleError(ErrorCode.QUOTA_EXCEEDED, message, quotaType ? { quotaType } : undefined);
	}

	/**
	 * Create an internal error
	 *
	 * @param message - Description of the internal error
	 * @param metadata - Optional context for debugging
	 */
	static internalError(message: string, metadata?: Record<string, unknown>): ModuleError {
		return new ModuleError(ErrorCode.INTERNAL_ERROR, message, metadata);
	}

	/**
	 * Create a not implemented error
	 *
	 * @param feature - What feature is not implemented
	 */
	static notImplemented(feature: string): ModuleError {
		return new ModuleError(ErrorCode.NOT_IMPLEMENTED, `Feature "${feature}" is not implemented`, { feature });
	}

	/**
	 * Create a configuration error
	 *
	 * @param message - Description of the configuration issue
	 * @param metadata - Optional context
	 */
	static configurationError(message: string, metadata?: Record<string, unknown>): ModuleError {
		return new ModuleError(ErrorCode.CONFIGURATION_ERROR, message, metadata);
	}
}
