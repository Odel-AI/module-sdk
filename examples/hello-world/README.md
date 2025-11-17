# Hello World Module

A simple example module demonstrating how to use `@odel/module-sdk` to create a module that accesses context information from mcp-proxy.

## What It Does

This module exposes a single tool called `greet_me` that:
- Takes no input parameters
- Reads the `userId` from the context object (provided by mcp-proxy)
- Returns a greeting message: `"Hello {userId}"`

## The Code

```typescript
import { createModule, SuccessResponseSchema } from '@odel/module-sdk';
import { z } from 'zod';

export default createModule()
  .tool({
    name: 'greet_me',
    description: 'Returns a personalized greeting using the user ID from context',
    inputSchema: z.object({}),
    outputSchema: SuccessResponseSchema(
      z.object({
        message: z.string().describe('Personalized greeting message')
      })
    ),
    handler: async (input, context) => {
      // context.userId is provided by mcp-proxy
      return {
        success: true as const,
        message: `Hello ${context.userId}`
      };
    }
  })
  .build();
```

## How Context Works

When mcp-proxy calls your module, it injects a context object into the request body:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "greet_me",
    "arguments": {}
  },
  "context": {
    "userId": "hashed-user-id-abc123",
    "displayName": "John Doe",
    "timestamp": 1700000000000,
    "requestId": "uuid-here",
    "secrets": {}
  }
}
```

The SDK automatically extracts this context and passes it to your handler function.

## Available Context Properties

- `userId` - Hashed user ID (privacy-safe)
- `displayName` - User's display name
- `conversationId` - Hashed conversation ID (if applicable)
- `timestamp` - Request timestamp (Unix milliseconds)
- `requestId` - Unique request ID (UUID)
- `secrets` - User-configured secrets (decrypted by mcp-proxy)
- `env` - Cloudflare Worker environment bindings

## Testing

Run the tests:

```bash
pnpm test
```

The tests verify:
1. MCP protocol compliance
2. The `greet_me` tool returns the correct greeting
3. Handles missing context gracefully (uses "anonymous" as fallback)

## Local Development

You can test this module locally using wrangler:

```bash
pnpm install
wrangler dev
```

Then make a request:

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "greet_me",
      "arguments": {}
    },
    "context": {
      "userId": "test-user-123",
      "displayName": "Test User",
      "timestamp": 1700000000000,
      "requestId": "test-request-id",
      "secrets": {}
    }
  }'
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"success\":true,\"message\":\"Hello test-user-123\"}"
    }]
  }
}
```
