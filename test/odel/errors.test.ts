import { describe, test, expect } from 'vitest';
import { ModuleError, ErrorCode } from '../../src/odel/errors.js';

describe('Odel Errors', () => {
	describe('ErrorCode', () => {
		test('should have validation errors in 1xxx range', () => {
			expect(ErrorCode.INVALID_INPUT).toBe(1001);
			expect(ErrorCode.MISSING_REQUIRED_FIELD).toBe(1002);
			expect(ErrorCode.INVALID_FORMAT).toBe(1003);
		});

		test('should have auth errors in 2xxx range', () => {
			expect(ErrorCode.MISSING_SECRET).toBe(2001);
			expect(ErrorCode.INVALID_SECRET).toBe(2002);
			expect(ErrorCode.UNAUTHORIZED).toBe(2003);
		});

		test('should have API errors in 3xxx range', () => {
			expect(ErrorCode.API_ERROR).toBe(3001);
			expect(ErrorCode.NETWORK_ERROR).toBe(3002);
			expect(ErrorCode.TIMEOUT).toBe(3003);
			expect(ErrorCode.NOT_FOUND).toBe(3004);
		});

		test('should have rate limit errors in 4xxx range', () => {
			expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe(4001);
			expect(ErrorCode.QUOTA_EXCEEDED).toBe(4002);
		});

		test('should have internal errors in 5xxx range', () => {
			expect(ErrorCode.INTERNAL_ERROR).toBe(5001);
			expect(ErrorCode.NOT_IMPLEMENTED).toBe(5002);
			expect(ErrorCode.CONFIGURATION_ERROR).toBe(5003);
		});
	});

	describe('ModuleError', () => {
		test('should create error with code and message', () => {
			const error = new ModuleError(ErrorCode.INVALID_INPUT, 'Invalid email address');

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ModuleError);
			expect(error.code).toBe(ErrorCode.INVALID_INPUT);
			expect(error.message).toBe('Invalid email address');
			expect(error.name).toBe('ModuleError');
			expect(error.metadata).toBeUndefined();
		});

		test('should create error with metadata', () => {
			const error = new ModuleError(ErrorCode.INVALID_INPUT, 'Invalid email', {
				field: 'email',
				value: 'not-an-email'
			});

			expect(error.metadata).toEqual({
				field: 'email',
				value: 'not-an-email'
			});
		});

		test('should serialize to JSON correctly', () => {
			const error = new ModuleError(ErrorCode.API_ERROR, 'External API failed', {
				statusCode: 500,
				service: 'payment'
			});

			const json = error.toJSON();

			expect(json).toEqual({
				success: false,
				error: 'External API failed',
				code: ErrorCode.API_ERROR,
				metadata: {
					statusCode: 500,
					service: 'payment'
				}
			});
		});

		test('should serialize without metadata when not provided', () => {
			const error = new ModuleError(ErrorCode.INTERNAL_ERROR, 'Something went wrong');

			const json = error.toJSON();

			expect(json).toEqual({
				success: false,
				error: 'Something went wrong',
				code: ErrorCode.INTERNAL_ERROR
			});
			expect('metadata' in json).toBe(false);
		});
	});

	describe('ModuleError static factories', () => {
		test('validationError should create INVALID_INPUT error', () => {
			const error = ModuleError.validationError('Email is required', { field: 'email' });

			expect(error.code).toBe(ErrorCode.INVALID_INPUT);
			expect(error.message).toBe('Email is required');
			expect(error.metadata).toEqual({ field: 'email' });
		});

		test('missingField should create MISSING_REQUIRED_FIELD error', () => {
			const error = ModuleError.missingField('subject');

			expect(error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
			expect(error.message).toBe('Required field "subject" is missing');
			expect(error.metadata).toEqual({ field: 'subject' });
		});

		test('missingSecret should create MISSING_SECRET error', () => {
			const error = ModuleError.missingSecret('RESEND_API_KEY');

			expect(error.code).toBe(ErrorCode.MISSING_SECRET);
			expect(error.message).toBe('Required secret "RESEND_API_KEY" is not configured');
			expect(error.metadata).toEqual({ secretName: 'RESEND_API_KEY' });
		});

		test('invalidSecret should create INVALID_SECRET error', () => {
			const error = ModuleError.invalidSecret('API_KEY', 'must start with sk-');

			expect(error.code).toBe(ErrorCode.INVALID_SECRET);
			expect(error.message).toBe('Secret "API_KEY" is invalid: must start with sk-');
			expect(error.metadata).toEqual({ secretName: 'API_KEY' });
		});

		test('invalidSecret without reason', () => {
			const error = ModuleError.invalidSecret('API_KEY');

			expect(error.message).toBe('Secret "API_KEY" is invalid');
		});

		test('apiError should create API_ERROR error', () => {
			const error = ModuleError.apiError('Payment gateway returned 503', {
				statusCode: 503,
				retryAfter: 30
			});

			expect(error.code).toBe(ErrorCode.API_ERROR);
			expect(error.message).toBe('Payment gateway returned 503');
			expect(error.metadata).toEqual({ statusCode: 503, retryAfter: 30 });
		});

		test('networkError should create NETWORK_ERROR error', () => {
			const error = ModuleError.networkError('Connection refused', {
				url: 'https://api.example.com'
			});

			expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
			expect(error.message).toBe('Connection refused');
		});

		test('timeout should create TIMEOUT error', () => {
			const error = ModuleError.timeout('API call', 30000);

			expect(error.code).toBe(ErrorCode.TIMEOUT);
			expect(error.message).toBe('Operation "API call" timed out');
			expect(error.metadata).toEqual({ timeoutMs: 30000 });
		});

		test('notFound should create NOT_FOUND error', () => {
			const error = ModuleError.notFound('User', 'user_123');

			expect(error.code).toBe(ErrorCode.NOT_FOUND);
			expect(error.message).toBe('User "user_123" not found');
			expect(error.metadata).toEqual({ identifier: 'user_123' });
		});

		test('notFound without identifier', () => {
			const error = ModuleError.notFound('Resource');

			expect(error.message).toBe('Resource not found');
			expect(error.metadata).toBeUndefined();
		});

		test('rateLimitError should create RATE_LIMIT_EXCEEDED error', () => {
			const error = ModuleError.rateLimitError(60);

			expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
			expect(error.message).toBe('Rate limit exceeded');
			expect(error.metadata).toEqual({ retryAfter: 60 });
		});

		test('rateLimitError without retryAfter', () => {
			const error = ModuleError.rateLimitError();

			expect(error.message).toBe('Rate limit exceeded');
			expect(error.metadata).toBeUndefined();
		});

		test('quotaExceeded should create QUOTA_EXCEEDED error', () => {
			const error = ModuleError.quotaExceeded('API calls');

			expect(error.code).toBe(ErrorCode.QUOTA_EXCEEDED);
			expect(error.message).toBe('API calls quota exceeded');
		});

		test('internalError should create INTERNAL_ERROR error', () => {
			const error = ModuleError.internalError('Unexpected state', { state: 'corrupted' });

			expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
			expect(error.message).toBe('Unexpected state');
		});

		test('notImplemented should create NOT_IMPLEMENTED error', () => {
			const error = ModuleError.notImplemented('bulk export');

			expect(error.code).toBe(ErrorCode.NOT_IMPLEMENTED);
			expect(error.message).toBe('Feature "bulk export" is not implemented');
			expect(error.metadata).toEqual({ feature: 'bulk export' });
		});

		test('configurationError should create CONFIGURATION_ERROR error', () => {
			const error = ModuleError.configurationError('Missing database binding');

			expect(error.code).toBe(ErrorCode.CONFIGURATION_ERROR);
			expect(error.message).toBe('Missing database binding');
		});
	});

	describe('ModuleError in try/catch', () => {
		test('should be catchable as Error', () => {
			const throwError = () => {
				throw ModuleError.missingSecret('API_KEY');
			};

			expect(throwError).toThrow(Error);
			expect(throwError).toThrow(ModuleError);
			expect(throwError).toThrow('Required secret "API_KEY" is not configured');
		});

		test('should preserve error properties when caught', () => {
			try {
				throw ModuleError.apiError('Service unavailable', { statusCode: 503 });
			} catch (error) {
				expect(error).toBeInstanceOf(ModuleError);
				if (error instanceof ModuleError) {
					expect(error.code).toBe(ErrorCode.API_ERROR);
					expect(error.metadata?.statusCode).toBe(503);
				}
			}
		});
	});
});
