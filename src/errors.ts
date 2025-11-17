/**
 * Standardized error handling for Odel modules
 */

/**
 * Error codes for module operations
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
 * @example
 * ```typescript
 * throw new ModuleError(
 *   ErrorCode.MISSING_SECRET,
 *   'RESEND_API_KEY secret is required',
 *   { secretName: 'RESEND_API_KEY' }
 * );
 * ```
 */
export class ModuleError extends Error {
	/**
	 * Create a new module error
	 * @param code - Error code from ErrorCode enum
	 * @param message - Human-readable error message
	 * @param metadata - Optional additional error context
	 */
	constructor(
		public code: ErrorCode,
		message: string,
		public metadata?: Record<string, any>
	) {
		super(message);
		this.name = 'ModuleError';

		// Maintains proper stack trace for where error was thrown (only available on V8)
		if (typeof (Error as any).captureStackTrace === 'function') {
			(Error as any).captureStackTrace(this, ModuleError);
		}
	}

	/**
	 * Convert error to JSON response format
	 * @returns Success/error response object
	 */
	toJSON() {
		return {
			success: false as const,
			error: this.message,
			code: this.code,
			...(this.metadata && { metadata: this.metadata })
		};
	}

	/**
	 * Create a validation error
	 */
	static validationError(message: string, metadata?: Record<string, any>) {
		return new ModuleError(ErrorCode.INVALID_INPUT, message, metadata);
	}

	/**
	 * Create a missing secret error
	 */
	static missingSecret(secretName: string) {
		return new ModuleError(
			ErrorCode.MISSING_SECRET,
			`Required secret "${secretName}" is not configured`,
			{ secretName }
		);
	}

	/**
	 * Create an API error
	 */
	static apiError(message: string, metadata?: Record<string, any>) {
		return new ModuleError(ErrorCode.API_ERROR, message, metadata);
	}

	/**
	 * Create a rate limit error
	 */
	static rateLimitError(retryAfter?: number) {
		return new ModuleError(
			ErrorCode.RATE_LIMIT_EXCEEDED,
			'Rate limit exceeded',
			retryAfter ? { retryAfter } : undefined
		);
	}
}
