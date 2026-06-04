import { describe, test, expect } from 'vitest';
import {
	getModuleContext,
	getRequiredSecret,
	getOptionalSecret,
	createToolContext,
	CONTEXT_META_KEY,
	SECRETS_META_KEY,
	type HandlerExtraLike
} from '../../src/odel/context.js';
import { ModuleError, ErrorCode } from '../../src/odel/errors.js';

/** Build a fake handler `extra` carrying the Odel `_meta` envelope. */
function fakeExtra(meta?: { context?: Record<string, unknown>; secrets?: Record<string, string> }): HandlerExtraLike {
	if (!meta) return {};
	const _meta: Record<string, unknown> = {};
	if (meta.context) _meta[CONTEXT_META_KEY] = meta.context;
	if (meta.secrets) _meta[SECRETS_META_KEY] = meta.secrets;
	return { _meta };
}

describe('getModuleContext', () => {
	test('returns anonymous defaults when no _meta present', () => {
		const ctx = getModuleContext({});
		expect(ctx.userId).toBe('anonymous');
		expect(ctx.displayName).toBe('Anonymous User');
		expect(ctx.conversationId).toBeUndefined();
		expect(typeof ctx.requestId).toBe('string');
		expect(ctx.requestId.length).toBeGreaterThan(0);
		expect(ctx.requestId).not.toBe('no-request-id');
		expect(typeof ctx.timestamp).toBe('number');
		expect(ctx.timestamp).toBeGreaterThan(0);
	});

	test('returns anonymous defaults when context key absent but other meta present', () => {
		const ctx = getModuleContext(fakeExtra({ secrets: { API_KEY: 'x' } }));
		expect(ctx.userId).toBe('anonymous');
	});

	test('reads full context from _meta[app.odel/context]', () => {
		const ctx = getModuleContext(
			fakeExtra({
				context: {
					userId: 'user_abc',
					conversationId: 'conv_1',
					displayName: 'Ada',
					timestamp: 1700000000000,
					requestId: 'req_42'
				}
			})
		);
		expect(ctx).toEqual({
			userId: 'user_abc',
			conversationId: 'conv_1',
			displayName: 'Ada',
			timestamp: 1700000000000,
			requestId: 'req_42'
		});
	});

	test('fills per-field defaults for partial context', () => {
		const ctx = getModuleContext(fakeExtra({ context: { userId: 'user_only' } }));
		expect(ctx.userId).toBe('user_only');
		expect(ctx.displayName).toBe('Anonymous User');
		expect(ctx.conversationId).toBeUndefined();
		expect(typeof ctx.requestId).toBe('string');
		expect(ctx.timestamp).toBeGreaterThan(0);
	});
});

describe('getRequiredSecret', () => {
	test('returns the secret value when present', () => {
		const extra = fakeExtra({ secrets: { RESEND_API_KEY: 're_123' } });
		expect(getRequiredSecret(extra, 'RESEND_API_KEY')).toBe('re_123');
	});

	test('throws ModuleError(MISSING_SECRET) when absent', () => {
		const extra = fakeExtra({ secrets: { OTHER: 'x' } });
		expect(() => getRequiredSecret(extra, 'RESEND_API_KEY')).toThrow(ModuleError);
		try {
			getRequiredSecret(extra, 'RESEND_API_KEY');
		} catch (e) {
			expect(e).toBeInstanceOf(ModuleError);
			expect((e as ModuleError).code).toBe(ErrorCode.MISSING_SECRET);
		}
	});

	test('throws when secrets envelope absent entirely', () => {
		expect(() => getRequiredSecret({}, 'ANY')).toThrow(ModuleError);
	});

	test('throws when value is empty string', () => {
		const extra = fakeExtra({ secrets: { EMPTY: '' } });
		expect(() => getRequiredSecret(extra, 'EMPTY')).toThrow(ModuleError);
	});
});

describe('getOptionalSecret', () => {
	test('returns value when present', () => {
		const extra = fakeExtra({ secrets: { WEBHOOK_URL: 'https://x' } });
		expect(getOptionalSecret(extra, 'WEBHOOK_URL')).toBe('https://x');
	});

	test('returns undefined when absent', () => {
		expect(getOptionalSecret(fakeExtra({ secrets: {} }), 'NOPE')).toBeUndefined();
		expect(getOptionalSecret({}, 'NOPE')).toBeUndefined();
	});
});

describe('createToolContext', () => {
	test('bundles identity context with env', () => {
		const env = { MY_KV: 'binding' };
		const extra = fakeExtra({ context: { userId: 'user_x', timestamp: 123, requestId: 'r1' } });
		const ctx = createToolContext(extra, env);
		expect(ctx.userId).toBe('user_x');
		expect(ctx.env).toBe(env);
	});
});

describe('envelope round-trip', () => {
	test('identity and secrets read back consistently from a single extra', () => {
		const extra = fakeExtra({
			context: { userId: 'u', displayName: 'U', timestamp: 1, requestId: 'r' },
			secrets: { A: '1', B: '2' }
		});
		expect(getModuleContext(extra).userId).toBe('u');
		expect(getRequiredSecret(extra, 'A')).toBe('1');
		expect(getOptionalSecret(extra, 'B')).toBe('2');
		expect(getOptionalSecret(extra, 'C')).toBeUndefined();
	});
});
