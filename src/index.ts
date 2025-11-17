/**
 * @odel/module-sdk
 *
 * SDK for building Odel modules - MCP protocol over HTTP for Cloudflare Workers
 *
 * @example
 * ```typescript
 * import { createModule, SuccessResponseSchema } from '@odel/module-sdk';
 * import { z } from 'zod';
 *
 * export default createModule()
 *   .tool({
 *     name: 'add',
 *     description: 'Add two numbers',
 *     inputSchema: z.object({
 *       a: z.number(),
 *       b: z.number()
 *     }),
 *     outputSchema: SuccessResponseSchema(
 *       z.object({ result: z.number() })
 *     ),
 *     handler: async (input, context) => {
 *       return { success: true as const, result: input.a + input.b };
 *     }
 *   })
 *   .build();
 * ```
 */

// Core module building
export { createModule, ModuleBuilder } from './module-builder';

// Type definitions
export type { ModuleTool, ModuleContext, ToolContext } from './types';

// Schema utilities
export { SuccessResponseSchema } from './schemas';

// Validators
export { validators } from './validators';

// Error handling
export { ModuleError, ErrorCode } from './errors';
