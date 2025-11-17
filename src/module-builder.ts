/**
 * Module builder for creating MCP-compliant Odel modules
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ModuleTool, ModuleContext, ToolContext } from './types';

// Cloudflare Workers types
/// <reference types="@cloudflare/workers-types" />

/**
 * Module builder class for creating MCP-compliant modules
 */
export class ModuleBuilder<Env = any> {
	private tools: ModuleTool<any, any>[] = [];

	/**
	 * Add a tool to the module
	 */
	tool<TInput extends z.ZodType, TOutput extends z.ZodType>(
		tool: ModuleTool<TInput, TOutput>
	): this {
		this.tools.push(tool);
		return this;
	}

	/**
	 * Convert module tools to MCP format
	 */
	private toMCPTools(extended: boolean = false) {
		return this.tools.map(tool => {
			const mcpTool: any = {
				name: tool.name,
				description: tool.description,
				inputSchema: zodToJsonSchema(tool.inputSchema, {
					$refStrategy: 'none',
					target: 'openApi3'
				})
			};

			// Include outputSchema only when extended=true (non-standard MCP extension)
			if (extended) {
				mcpTool.outputSchema = zodToJsonSchema(tool.outputSchema, {
					$refStrategy: 'none',
					target: 'openApi3'
				});
			}

			return mcpTool;
		});
	}

	/**
	 * Build the Cloudflare Worker handler
	 */
	build(): ExportedHandler<Env> {
		const tools = this.tools;
		const toMCPTools = (extended: boolean = false) => this.toMCPTools(extended);

		return {
			async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
				try {
					// Handle MCP tools/list request
					if (request.method === 'POST') {
						const body = await request.json() as any;

						// MCP initialize (required by spec)
						if (body.method === 'initialize') {
							return Response.json({
								jsonrpc: '2.0',
								id: body.id,
								result: {
									protocolVersion: '2024-11-05',
									capabilities: {
										tools: {}
									},
									serverInfo: {
										name: 'odel-module',
										version: '1.0.0'
									}
								}
							});
						}

						// MCP initialized notification (client confirms ready)
						// Handles both 'initialized' and 'notifications/initialized'
						if (body.method === 'initialized' || body.method === 'notifications/initialized') {
							// No response needed for notifications
							return new Response(null, { status: 204 });
						}

						// MCP tools/list (with optional extended parameter)
						if (body.method === 'tools/list') {
							const extended = body.params?.extended === true;
							const mcpTools = toMCPTools(extended);

							return Response.json({
								jsonrpc: '2.0',
								id: body.id,
								result: {
									tools: mcpTools
								}
							});
						}

						// MCP tools/call
						if (body.method === 'tools/call') {
							const { name, arguments: args } = body.params;
							const tool = tools.find(t => t.name === name);

							if (!tool) {
								return Response.json({
									jsonrpc: '2.0',
									id: body.id,
									error: {
										code: -32601,
										message: `Tool ${name} not found`
									}
								}, { status: 404 });
							}

							// Validate input with Zod
							const validationResult = tool.inputSchema.safeParse(args);
							if (!validationResult.success) {
								return Response.json({
									jsonrpc: '2.0',
									id: body.id,
									error: {
										code: -32602,
										message: 'Invalid parameters',
										data: validationResult.error.errors
									}
								}, { status: 400 });
							}

							// Execute tool
							const moduleContext: ModuleContext = body.context || {
								userId: 'anonymous',
								displayName: 'Anonymous User',
								timestamp: Date.now(),
								requestId: crypto.randomUUID(),
								secrets: {}
							};

							const context: ToolContext<Env> = {
								...moduleContext,
								env
							};

							const result = await tool.handler(validationResult.data, context);

							// Validate output
							const outputValidation = tool.outputSchema.safeParse(result);
							if (!outputValidation.success) {
								return Response.json({
									jsonrpc: '2.0',
									id: body.id,
									error: {
										code: -32603,
										message: 'Tool returned invalid output',
										data: outputValidation.error.errors
									}
								}, { status: 500 });
							}

							return Response.json({
								jsonrpc: '2.0',
								id: body.id,
								result: {
									content: [{
										type: 'text',
										text: JSON.stringify(result)
									}]
								}
							});
						}

						// Unknown method
						return Response.json({
							jsonrpc: '2.0',
							id: body.id,
							error: {
								code: -32601,
								message: `Unknown method: ${body.method}`
							}
						}, { status: 404 });
					}

					return Response.json({
						error: 'Method not allowed'
					}, { status: 405 });

				} catch (error: any) {
					return Response.json({
						jsonrpc: '2.0',
						id: null,
						error: {
							code: -32603,
							message: 'Internal error',
							data: error.message
						}
					}, { status: 500 });
				}
			}
		};
	}
}

/**
 * Create a new module builder with optional environment typing
 *
 * @example
 * ```typescript
 * interface Env {
 *   RESEND_API_KEY: string;
 *   ANALYTICS: AnalyticsEngine;
 * }
 *
 * export default createModule<Env>()
 *   .tool({ ... })
 *   .build();
 * ```
 */
export function createModule<Env = any>(): ModuleBuilder<Env> {
	return new ModuleBuilder<Env>();
}
