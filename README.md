# @odel/module-sdk

> SDK for building Odel modules - MCP protocol over HTTP for Cloudflare Workers

Build type-safe AI modules for the Odel platform using TypeScript, Zod schemas, and the Model Context Protocol (MCP).

## Installation

```bash
npm install @odel/module-sdk zod
# or
pnpm add @odel/module-sdk zod
# or
yarn add @odel/module-sdk zod
```

## Quick Start

Create a simple calculator module:

```typescript
import { createModule, SuccessResponseSchema } from '@odel/module-sdk';
import { z } from 'zod';

export default createModule()
  .tool({
    name: 'add',
    description: 'Add two numbers together',
    inputSchema: z.object({
      a: z.number().describe('First number'),
      b: z.number().describe('Second number')
    }),
    outputSchema: SuccessResponseSchema(
      z.object({
        result: z.number().describe('Sum of a and b')
      })
    ),
    handler: async (input, context) => {
      return {
        success: true as const,
        result: input.a + input.b
      };
    }
  })
  .build();
```

## Features

- **Type-Safe**: Full TypeScript support with automatic type inference from Zod schemas
- **MCP Compliant**: Implements Model Context Protocol over HTTP
- **Extended MCP**: Optional `outputSchema` support for better code generation
- **Cloudflare Workers**: Built for Cloudflare Workers with first-class support
- **Testing Utilities**: Built-in test helpers for MCP compliance and tool testing
- **Error Handling**: Standardized error codes and error handling
- **Validators**: Common Zod validators for emails, URLs, API keys, and more

## Core API

### `createModule<Env>()`

Create a new module builder with optional environment typing:

```typescript
interface Env {
  RESEND_API_KEY: string;
  ANALYTICS: AnalyticsEngine;
}

export default createModule<Env>()
  .tool({ ... })
  .build();
```

### `SuccessResponseSchema(dataSchema)`

Create a union type for success/error responses:

```typescript
const outputSchema = SuccessResponseSchema(
  z.object({
    messageId: z.string()
  })
);

// Valid responses:
// { success: true, messageId: "123" }
// { success: false, error: "Something went wrong" }
```

### Tool Context

Every tool handler receives a `ToolContext` with:

```typescript
interface ToolContext<Env> {
  userId: string;              // Hashed user ID
  conversationId?: string;     // Hashed conversation ID
  displayName: string;         // User's display name
  timestamp: number;           // Request timestamp
  requestId: string;           // Unique request ID
  secrets: Record<string, string>;  // User-configured secrets
  env: Env;                    // Cloudflare Worker bindings
}
```

## Using Secrets

Access user-configured secrets through the context:

```typescript
handler: async (input, context) => {
  const apiKey = context.secrets.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false as const,
      error: 'RESEND_API_KEY secret is required'
    };
  }

  // Use the API key...
}
```

## Using Validators

The SDK includes common validators to reduce boilerplate:

```typescript
import { createModule, validators } from '@odel/module-sdk';

export default createModule()
  .tool({
    name: 'send_email',
    inputSchema: z.object({
      to: validators.email(),
      cc: validators.emailList().optional(),
      apiKey: validators.apiKey('sk-')
    }),
    // ...
  })
  .build();
```

Available validators:
- `validators.email()` - Email address
- `validators.emailList()` - Comma-separated email list
- `validators.url()` - HTTP/HTTPS URL
- `validators.httpsUrl()` - HTTPS-only URL
- `validators.apiKey(prefix?)` - API key with optional prefix
- `validators.json<T>()` - JSON string parser
- `validators.uuid()` - UUID validation
- And more...

## Error Handling

Use `ModuleError` for standardized error responses:

```typescript
import { ModuleError, ErrorCode } from '@odel/module-sdk';

handler: async (input, context) => {
  if (!context.secrets.API_KEY) {
    throw ModuleError.missingSecret('API_KEY');
  }

  try {
    // API call...
  } catch (error) {
    throw ModuleError.apiError('Failed to call API', {
      statusCode: 500
    });
  }
}
```

Error codes:
- `ErrorCode.INVALID_INPUT` - Validation errors
- `ErrorCode.MISSING_SECRET` - Missing required secrets
- `ErrorCode.API_ERROR` - External API failures
- `ErrorCode.RATE_LIMIT_EXCEEDED` - Rate limiting
- And more...

## Testing

The SDK includes testing utilities for MCP compliance and tool testing:

```typescript
import { describe, test } from 'vitest';
import { testMCPCompliance, testTool, expectSuccess } from '@odel/module-sdk/testing';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from './src/index';

// Test MCP protocol compliance
testMCPCompliance(
  () => ({ worker, env, createExecutionContext, waitOnExecutionContext }),
  ['add', 'subtract'] // Expected tool names
);

// Test individual tools
describe('Calculator tools', () => {
  test('add tool works correctly', async () => {
    const result = await testTool(worker, 'add', { a: 1, b: 2 });
    expectSuccess(result);
    expect(result.result).toBe(3);
  });

  test('handles invalid input', async () => {
    const result = await testTool(worker, 'add', { a: 'not a number', b: 2 });
    expectError(result, /invalid/i);
  });
});
```

## Example: Email Module

```typescript
import { createModule, SuccessResponseSchema, validators, ModuleError } from '@odel/module-sdk';
import { z } from 'zod';

interface Env {
  // No env secrets needed - uses user's configured secrets
}

export default createModule<Env>()
  .tool({
    name: 'send_email',
    description: 'Send an email via Resend',
    inputSchema: z.object({
      to: validators.email(),
      subject: validators.nonEmptyString(),
      body: z.string()
    }),
    outputSchema: SuccessResponseSchema(
      z.object({
        messageId: z.string()
      })
    ),
    handler: async (input, context) => {
      const apiKey = context.secrets.RESEND_API_KEY;

      if (!apiKey) {
        throw ModuleError.missingSecret('RESEND_API_KEY');
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'noreply@example.com',
          to: input.to,
          subject: input.subject,
          html: input.body
        })
      });

      if (!response.ok) {
        throw ModuleError.apiError(`Failed to send email: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true as const,
        messageId: data.id
      };
    }
  })
  .build();
```

## Development

```bash
# Build the SDK
pnpm build

# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

## Publishing

```bash
# Build and test before publishing
pnpm prepublishOnly

# Publish to npm
npm publish
```

## License

MIT

## Links

- [GitHub Repository](https://github.com/odel-ai/module-sdk)
- [Odel Platform](https://odel.app)
- [MCP Specification](https://modelcontextprotocol.io/)
