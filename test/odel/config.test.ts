import { describe, test, expect } from 'vitest';
import { z } from 'zod';
import { parseConfig, configRequiredSecretNames, buildConfigManifest, registerOdelConfig, ODEL_CONFIG_URI } from '../../src/odel/config.js';
import { SECRETS_META_KEY, type HandlerExtraLike } from '../../src/odel/context.js';
import { ModuleError, ErrorCode } from '../../src/odel/errors.js';

function extraWithSecrets(secrets: Record<string, string>): HandlerExtraLike {
	return { _meta: { [SECRETS_META_KEY]: secrets } };
}

const configSchema = z.object({
	RESEND_API_KEY: z.string().min(5).describe('Resend API key'),
	FROM_ADDRESS: z.string().email().optional().describe('Optional sender override')
});

describe('parseConfig', () => {
	test('returns typed, validated config when all required present', () => {
		const cfg = parseConfig(configSchema, extraWithSecrets({ RESEND_API_KEY: 're_12345' }));
		expect(cfg.RESEND_API_KEY).toBe('re_12345');
		expect(cfg.FROM_ADDRESS).toBeUndefined();
	});

	test('includes optional fields when provided', () => {
		const cfg = parseConfig(
			configSchema,
			extraWithSecrets({ RESEND_API_KEY: 're_12345', FROM_ADDRESS: 'me@example.com' })
		);
		expect(cfg.FROM_ADDRESS).toBe('me@example.com');
	});

	test('throws ModuleError(MISSING_SECRET) when a required key is absent', () => {
		try {
			parseConfig(configSchema, extraWithSecrets({}));
			throw new Error('should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(ModuleError);
			expect((e as ModuleError).code).toBe(ErrorCode.MISSING_SECRET);
			expect((e as ModuleError).metadata).toEqual({ secretName: 'RESEND_API_KEY' });
		}
	});

	test('throws ModuleError(INVALID_SECRET) when a present value fails validation', () => {
		try {
			parseConfig(configSchema, extraWithSecrets({ RESEND_API_KEY: 'no' })); // too short
			throw new Error('should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(ModuleError);
			expect((e as ModuleError).code).toBe(ErrorCode.INVALID_SECRET);
		}
	});
});

describe('configRequiredSecretNames', () => {
	test('lists only required (non-optional) field names', () => {
		expect(configRequiredSecretNames(configSchema)).toEqual(['RESEND_API_KEY']);
	});

	test('returns empty array for an all-optional schema', () => {
		const schema = z.object({ A: z.string().optional(), B: z.string().optional() });
		expect(configRequiredSecretNames(schema)).toEqual([]);
	});

	test('returns all names when none are optional', () => {
		const schema = z.object({ A: z.string(), B: z.string() });
		expect(configRequiredSecretNames(schema)).toEqual(['A', 'B']);
	});
});

describe('buildConfigManifest', () => {
	test('returns [] when no schema is declared', () => {
		expect(buildConfigManifest()).toEqual([]);
	});

	test('maps each field to { name, description, required }', () => {
		expect(buildConfigManifest(configSchema)).toEqual([
			{ name: 'RESEND_API_KEY', description: 'Resend API key', required: true },
			{ name: 'FROM_ADDRESS', description: 'Optional sender override', required: false }
		]);
	});
});

describe('registerOdelConfig', () => {
	/** Minimal stub capturing the registerResource call. */
	function stubServer() {
		const calls: { name: string; uri: string; meta: unknown; cb: (uri: URL) => Promise<{ contents: { text: string }[] }> }[] = [];
		const server = {
			registerResource: (name: string, uri: string, meta: unknown, cb: (uri: URL) => Promise<{ contents: { text: string }[] }>) => {
				calls.push({ name, uri, meta, cb });
			}
		};
		return { server, calls };
	}

	test('registers the odel://config resource with the declared manifest', async () => {
		const { server, calls } = stubServer();
		registerOdelConfig(server as never, configSchema);
		expect(calls).toHaveLength(1);
		expect(calls[0].uri).toBe(ODEL_CONFIG_URI);
		const result = await calls[0].cb(new URL(ODEL_CONFIG_URI));
		const payload = JSON.parse(result.contents[0].text) as { secrets: { name: string }[] };
		expect(payload.secrets.map(s => s.name)).toEqual(['RESEND_API_KEY', 'FROM_ADDRESS']);
	});

	test('always registers the resource — empty secrets when no schema', async () => {
		const { server, calls } = stubServer();
		registerOdelConfig(server as never);
		expect(calls[0].uri).toBe(ODEL_CONFIG_URI);
		const result = await calls[0].cb(new URL(ODEL_CONFIG_URI));
		expect(JSON.parse(result.contents[0].text)).toEqual({ secrets: [] });
	});
});
