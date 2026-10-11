import { describe, test, expect } from 'vitest';
import { z } from 'zod';
import { createOdelServer, OdelServer, REQUIRES_SECRETS_META_KEY, WebStandardStreamableHTTPServerTransport } from '../../src/server.js';
import { CONFIGURED_META_KEY, CONTEXT_META_KEY, SECRETS_META_KEY } from '../../src/odel/context.js';
import { ErrorCode } from '../../src/odel/errors.js';

let runs: string[] = [];

function build(): OdelServer {
	const server = createOdelServer({ name: 'gated', version: '1.0.0' });
	const reply = (name: string) => async () => {
		runs.push(name);
		return { content: [{ type: 'text' as const, text: name }] };
	};
	server.registerTool('open', { description: 'Needs nothing' }, reply('open'));
	server.registerTool('search', { description: 'Needs both', inputSchema: { q: z.string() }, requiresSecrets: ['ID', 'SECRET'] }, reply('search'));
	server.registerTool('status', { description: 'Needs the id', requiresSecrets: ['ID'], _meta: { own: 1 } }, reply('status'));
	return server;
}

async function rpc(method: string, params: Record<string, unknown> = {}): Promise<any> {
	const server = build();
	const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
	await server.connect(transport);
	const res = await transport.handleRequest(
		new Request('http://module/mcp', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
			body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
		})
	);
	return ((await res.json()) as { result: any }).result;
}

const listed = async (meta?: Record<string, unknown>) =>
	((await rpc('tools/list', meta ? { _meta: meta } : {})).tools as Array<{ name: string }>).map(t => t.name).sort();

describe('requiresSecrets — tools/list', () => {
	test('with no Odel envelope every tool is listed, gated ones advertising what they need', async () => {
		const { tools } = await rpc('tools/list');
		expect(tools.map((t: { name: string }) => t.name).sort()).toEqual(['open', 'search', 'status']);
		const search = tools.find((t: { name: string }) => t.name === 'search');
		expect(search._meta).toEqual({ [REQUIRES_SECRETS_META_KEY]: ['ID', 'SECRET'] });
		const status = tools.find((t: { name: string }) => t.name === 'status');
		expect(status._meta).toEqual({ own: 1, [REQUIRES_SECRETS_META_KEY]: ['ID'] });
		expect(tools.find((t: { name: string }) => t.name === 'open')._meta).toBeUndefined();
	});

	test('nothing configured hides every gated tool', async () => {
		expect(await listed({ [CONFIGURED_META_KEY]: [] })).toEqual(['open']);
	});

	test('a tool is listed only once all of its secrets are configured', async () => {
		expect(await listed({ [CONFIGURED_META_KEY]: ['ID'] })).toEqual(['open', 'status']);
		expect(await listed({ [CONFIGURED_META_KEY]: ['ID', 'SECRET', 'OTHER'] })).toEqual(['open', 'search', 'status']);
	});

	test('an identity context without secrets counts as nothing configured', async () => {
		expect(await listed({ [CONTEXT_META_KEY]: { userId: 'u1' } })).toEqual(['open']);
	});
});

describe('requiresSecrets — tools/call', () => {
	test('a gated tool missing secrets answers MISSING_SECRET without running', async () => {
		runs = [];
		const result = await rpc('tools/call', { name: 'search', arguments: { q: 'x' }, _meta: { [SECRETS_META_KEY]: { ID: 'a', SECRET: '' } } });

		expect(result.isError).toBe(true);
		expect(JSON.parse(result.content[0].text)).toEqual({
			success: false,
			error: 'Tool "search" needs secrets that are not configured: SECRET',
			code: ErrorCode.MISSING_SECRET,
			metadata: { secretName: 'SECRET', secretNames: ['SECRET'] }
		});
		expect(runs).toEqual([]);
	});

	test('it runs once its secrets are there', async () => {
		runs = [];
		const result = await rpc('tools/call', { name: 'search', arguments: { q: 'x' }, _meta: { [SECRETS_META_KEY]: { ID: 'a', SECRET: 'b' } } });
		expect(result.isError).toBeFalsy();
		expect(runs).toEqual(['search']);
	});

	test('with no Odel envelope the handler runs and decides for itself', async () => {
		runs = [];
		await rpc('tools/call', { name: 'search', arguments: { q: 'x' } });
		expect(runs).toEqual(['search']);
	});

	test('ungated tools are untouched', async () => {
		runs = [];
		await rpc('tools/call', { name: 'open', arguments: {}, _meta: { [SECRETS_META_KEY]: {} } });
		expect(runs).toEqual(['open']);
	});
});

test('createOdelServer still exposes the odel://config marker', async () => {
	const result = await rpc('resources/read', { uri: 'odel://config' });
	expect(JSON.parse(result.contents[0].text)).toEqual({ secrets: [] });
});
