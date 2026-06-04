import { describe, test, expect } from 'vitest';
import { z } from 'zod';
import { validators } from '../../src/odel/validators.js';

describe('Odel Validators', () => {
	describe('email', () => {
		test('should accept valid email', () => {
			const schema = validators.email();
			expect(schema.parse('user@example.com')).toBe('user@example.com');
		});

		test('should reject invalid email', () => {
			const schema = validators.email();
			expect(() => schema.parse('not-an-email')).toThrow();
		});
	});

	describe('emailList', () => {
		test('should accept array of emails', () => {
			const schema = validators.emailList();
			const result = schema.parse(['a@example.com', 'b@example.com']);
			expect(result).toEqual(['a@example.com', 'b@example.com']);
		});

		test('should accept comma-separated string', () => {
			const schema = validators.emailList();
			const result = schema.parse('a@example.com, b@example.com');
			expect(result).toEqual(['a@example.com', 'b@example.com']);
		});

		test('should reject invalid emails in list', () => {
			const schema = validators.emailList();
			expect(() => schema.parse('valid@example.com, not-an-email')).toThrow();
		});
	});

	describe('url', () => {
		test('should accept http URL', () => {
			const schema = validators.url();
			expect(schema.parse('http://example.com')).toBe('http://example.com');
		});

		test('should accept https URL', () => {
			const schema = validators.url();
			expect(schema.parse('https://example.com/path')).toBe('https://example.com/path');
		});

		test('should reject invalid URL', () => {
			const schema = validators.url();
			expect(() => schema.parse('not-a-url')).toThrow();
		});
	});

	describe('httpsUrl', () => {
		test('should accept https URL', () => {
			const schema = validators.httpsUrl();
			expect(schema.parse('https://example.com')).toBe('https://example.com');
		});

		test('should reject http URL', () => {
			const schema = validators.httpsUrl();
			expect(() => schema.parse('http://example.com')).toThrow(/HTTPS/);
		});
	});

	describe('apiKey', () => {
		test('should accept key without prefix requirement', () => {
			const schema = validators.apiKey();
			expect(schema.parse('my-api-key-1234567890')).toBe('my-api-key-1234567890');
		});

		test('should reject key shorter than 10 chars', () => {
			const schema = validators.apiKey();
			expect(() => schema.parse('short')).toThrow(/at least 10/);
		});

		test('should accept key with correct prefix', () => {
			const schema = validators.apiKey('sk-');
			expect(schema.parse('sk-1234567890')).toBe('sk-1234567890');
		});

		test('should reject key with wrong prefix', () => {
			const schema = validators.apiKey('sk-');
			expect(() => schema.parse('pk-1234567890')).toThrow(/sk-/);
		});
	});

	describe('json', () => {
		test('should parse valid JSON string', () => {
			const schema = validators.json<{ name: string }>();
			const result = schema.parse('{"name": "test"}');
			expect(result).toEqual({ name: 'test' });
		});

		test('should reject invalid JSON', () => {
			const schema = validators.json();
			expect(() => schema.parse('not valid json')).toThrow(/Invalid JSON/);
		});

		test('should parse arrays', () => {
			const schema = validators.json<string[]>();
			const result = schema.parse('["a", "b", "c"]');
			expect(result).toEqual(['a', 'b', 'c']);
		});
	});

	describe('nonEmptyString', () => {
		test('should accept non-empty string', () => {
			const schema = validators.nonEmptyString();
			expect(schema.parse('hello')).toBe('hello');
		});

		test('should reject empty string', () => {
			const schema = validators.nonEmptyString();
			expect(() => schema.parse('')).toThrow(/cannot be empty/);
		});
	});

	describe('positiveInt', () => {
		test('should accept positive integer', () => {
			const schema = validators.positiveInt();
			expect(schema.parse(42)).toBe(42);
		});

		test('should reject zero', () => {
			const schema = validators.positiveInt();
			expect(() => schema.parse(0)).toThrow();
		});

		test('should reject negative', () => {
			const schema = validators.positiveInt();
			expect(() => schema.parse(-1)).toThrow();
		});

		test('should reject float', () => {
			const schema = validators.positiveInt();
			expect(() => schema.parse(3.14)).toThrow();
		});
	});

	describe('nonNegativeInt', () => {
		test('should accept zero', () => {
			const schema = validators.nonNegativeInt();
			expect(schema.parse(0)).toBe(0);
		});

		test('should accept positive', () => {
			const schema = validators.nonNegativeInt();
			expect(schema.parse(100)).toBe(100);
		});

		test('should reject negative', () => {
			const schema = validators.nonNegativeInt();
			expect(() => schema.parse(-1)).toThrow();
		});
	});

	describe('port', () => {
		test('should accept valid port', () => {
			const schema = validators.port();
			expect(schema.parse(8080)).toBe(8080);
		});

		test('should accept min port', () => {
			const schema = validators.port();
			expect(schema.parse(1)).toBe(1);
		});

		test('should accept max port', () => {
			const schema = validators.port();
			expect(schema.parse(65535)).toBe(65535);
		});

		test('should reject port 0', () => {
			const schema = validators.port();
			expect(() => schema.parse(0)).toThrow();
		});

		test('should reject port > 65535', () => {
			const schema = validators.port();
			expect(() => schema.parse(65536)).toThrow();
		});
	});

	describe('isoDate', () => {
		test('should accept valid ISO date', () => {
			const schema = validators.isoDate();
			expect(schema.parse('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00Z');
		});

		test('should reject invalid date format', () => {
			const schema = validators.isoDate();
			expect(() => schema.parse('2024-01-15')).toThrow();
		});
	});

	describe('uuid', () => {
		test('should accept valid UUID', () => {
			const schema = validators.uuid();
			const uuid = '550e8400-e29b-41d4-a716-446655440000';
			expect(schema.parse(uuid)).toBe(uuid);
		});

		test('should reject invalid UUID', () => {
			const schema = validators.uuid();
			expect(() => schema.parse('not-a-uuid')).toThrow();
		});
	});

	describe('enumFrom', () => {
		test('should accept valid enum value', () => {
			const schema = validators.enumFrom(['draft', 'published', 'archived'] as const);
			expect(schema.parse('draft')).toBe('draft');
			expect(schema.parse('published')).toBe('published');
		});

		test('should reject invalid enum value', () => {
			const schema = validators.enumFrom(['draft', 'published'] as const);
			expect(() => schema.parse('invalid')).toThrow();
		});
	});

	describe('optionalString', () => {
		test('should pass through non-empty string', () => {
			const schema = validators.optionalString();
			expect(schema.parse('hello')).toBe('hello');
		});

		test('should transform empty string to undefined', () => {
			const schema = validators.optionalString();
			expect(schema.parse('')).toBeUndefined();
		});

		test('should pass through undefined', () => {
			const schema = validators.optionalString();
			expect(schema.parse(undefined)).toBeUndefined();
		});
	});

	describe('trimmedString', () => {
		test('should trim whitespace', () => {
			const schema = validators.trimmedString();
			expect(schema.parse('  hello  ')).toBe('hello');
		});

		test('should reject whitespace-only string', () => {
			const schema = validators.trimmedString();
			expect(() => schema.parse('   ')).toThrow(/cannot be empty/);
		});
	});

	describe('boundedString', () => {
		test('should accept string within bounds', () => {
			const schema = validators.boundedString(1, 10);
			expect(schema.parse('hello')).toBe('hello');
		});

		test('should reject string too short', () => {
			const schema = validators.boundedString(5, 10);
			expect(() => schema.parse('hi')).toThrow();
		});

		test('should reject string too long', () => {
			const schema = validators.boundedString(1, 5);
			expect(() => schema.parse('this is too long')).toThrow();
		});
	});

	describe('composing validators in schemas', () => {
		test('should work with z.object', () => {
			const inputSchema = z.object({
				email: validators.email(),
				recipients: validators.emailList(),
				webhookUrl: validators.httpsUrl().optional(),
				priority: validators.enumFrom(['low', 'medium', 'high'] as const)
			});

			const result = inputSchema.parse({
				email: 'sender@example.com',
				recipients: 'a@example.com, b@example.com',
				priority: 'high'
			});

			expect(result.email).toBe('sender@example.com');
			expect(result.recipients).toEqual(['a@example.com', 'b@example.com']);
			expect(result.webhookUrl).toBeUndefined();
			expect(result.priority).toBe('high');
		});
	});
});
