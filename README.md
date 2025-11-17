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

### 1. Install Dependencies

```bash
npm install @odel/module-sdk zod
npm install -D wrangler
```

The SDK has peer dependencies that will be automatically suggested by your package manager:
- `@cloudflare/workers-types` - Type definitions for Cloudflare Workers
- `@cloudflare/vitest-pool-workers` - Vitest pool for testing Workers
- `vitest` - Test framework
- `typescript` - TypeScript compiler

Install them with:
```bash
npm install -D @cloudflare/workers-types @cloudflare/vitest-pool-workers typescript vitest
```

### 2. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "types": ["@cloudflare/workers-types", "vitest/globals"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. Configure Vitest

Create `vitest.config.ts`:

```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    globals: true,
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' }
      }
    }
  }
});
```

### 4. Configure Wrangler

Create `wrangler.toml`:

```toml
name = "my-module"
main = "src/index.ts"
compatibility_date = "2025-01-17"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true
```

### 5. Add Type Declaration for Tests

Create `src/cloudflare-test.d.ts`:

```typescript
declare module 'cloudflare:test' {
  import type { ExecutionContext } from '@cloudflare/workers-types';
  export function createExecutionContext(): ExecutionContext;
  export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
  export const env: any;
}
```

> **Note:** This file provides TypeScript types for the `cloudflare:test` module, which is only available during testing with `@cloudflare/vitest-pool-workers`.

### 6. Create Your Module

Create `src/index.ts`:

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
    handler: async (input, _context) => {
      return {
        success: true as const,
        result: input.a + input.b
      };
    }
  })
  .build();
```

### 7. Add Tests

Create `src/index.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { testMCPCompliance, testTool, expectSuccess } from '@odel/module-sdk/testing';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from './index';

// Test MCP protocol compliance
testMCPCompliance(
  () => ({ worker, env, createExecutionContext, waitOnExecutionContext }),
  ['add'] // Expected tool names
);

describe('Calculator', () => {
  test('add works correctly', async () => {
    const result = await testTool(worker, 'add', { a: 2, b: 3 });
    expectSuccess(result);
    expect(result.result).toBe(5);
  });
});
```

### 8. Add Scripts to package.json

```json
{
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "deploy": "wrangler deploy",
    "dev": "wrangler dev"
  }
}
```

### 9. Run Tests

```bash
npm test
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

## License

MIT

## Links

- [GitHub Repository](https://github.com/odel-ai/module-sdk)
- [Odel Platform](https://odel.app)
- [MCP Specification](https://modelcontextprotocol.io/)
