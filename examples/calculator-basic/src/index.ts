/**
 * Calculator module — the reference example for @odel/module-sdk v2.
 *
 * Demonstrates the canonical pattern:
 * - build an official `McpServer` and register tools with Zod input shapes
 * - read Odel per-request context via the handler's `extra`
 * - serve over the stateless Web-standard Streamable HTTP transport
 *
 * This module needs no secrets. For a module that does, declare a
 * `configSchema` and read it with `parseConfig(configSchema, extra)` — see the
 * commented example at the bottom.
 */

import { createOdelServer, WebStandardStreamableHTTPServerTransport, type CallToolResult } from '@odel/module-sdk/server';
import { getModuleContext, SuccessResponseSchema } from '@odel/module-sdk';
import { z } from 'zod';

// Shared input shape for binary operations (a raw Zod shape, as registerTool expects).
const binaryInput = {
	a: z.number().describe('First number'),
	b: z.number().describe('Second number')
};

// Output contract (handy for typing / future structured-output validation).
const binaryOutput = SuccessResponseSchema(z.object({ result: z.number().describe('Operation result') }));
type BinaryOutput = z.infer<typeof binaryOutput>;

/** Wrap a result object as an MCP tool result (text + structured content). */
function toolResult(output: BinaryOutput): CallToolResult {
	return {
		content: [{ type: 'text', text: JSON.stringify(output) }],
		structuredContent: output
	};
}

/** Build a fresh server per request (stateless). */
function buildServer() {
	// createOdelServer always exposes the `odel://config` marker (here empty,
	// since calculator declares no secrets) so it's identifiable as an Odel module.
	const server = createOdelServer({ name: 'calculator-basic', version: '2.0.0' });

	server.registerTool('add', { description: 'Add two numbers together', inputSchema: binaryInput }, async ({ a, b }, extra) => {
		// Per-request Odel context is available here if a tool needs it:
		// const { userId } = getModuleContext(extra);
		void getModuleContext(extra);
		return toolResult({ success: true, result: a + b });
	});

	server.registerTool('subtract', { description: 'Subtract the second number from the first', inputSchema: binaryInput }, async ({ a, b }) =>
		toolResult({ success: true, result: a - b })
	);

	server.registerTool('multiply', { description: 'Multiply two numbers together', inputSchema: binaryInput }, async ({ a, b }) =>
		toolResult({ success: true, result: a * b })
	);

	server.registerTool('divide', { description: 'Divide the first number by the second', inputSchema: binaryInput }, async ({ a, b }) => {
		if (b === 0) {
			return toolResult({ success: false, error: 'Division by zero' });
		}
		return toolResult({ success: true, result: a / b });
	});

	return server;
}

export default {
	async fetch(request: Request): Promise<Response> {
		// Optional health check.
		if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
			return Response.json({ status: 'ok' });
		}

		const server = buildServer();
		// Stateless: no session id generator → the transport accepts a bare
		// `tools/call` with no `initialize` handshake (how mcp-proxy calls modules).
		const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
		await server.connect(transport);
		return transport.handleRequest(request);
	}
};

/*
 * --- Modules that need secrets ---
 *
 * import { parseConfig } from '@odel/module-sdk';
 *
 * export const configSchema = z.object({
 *   RESEND_API_KEY: z.string().min(1).describe('Resend API key'),
 * });
 *
 * // inside a handler:
 * //   const cfg = parseConfig(configSchema, extra);
 * //   await send(cfg.RESEND_API_KEY); // typed string, validated, throws ModuleError if missing
 */
