/**
 * Code-declared module configuration (Smithery-style)
 *
 * A module declares the secrets/config it needs as a Zod object schema:
 *
 * ```typescript
 * import { z } from 'zod';
 *
 * export const configSchema = z.object({
 *   RESEND_API_KEY: z.string().min(1).describe('Resend API key'),
 *   FROM_ADDRESS: z.string().email().optional().describe('Override sender'),
 * });
 * ```
 *
 * At runtime, `parseConfig` validates the per-user secrets envelope against the
 * schema and hands back a typed, validated config object. At build time, the
 * dev-portal extracts `configRequiredSecretNames(configSchema)` into the
 * module's `requiredSecretsJson` — so the same declaration drives both the
 * runtime check and the install-time UI, with no drift.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SECRETS_META_KEY, type HandlerExtraLike } from './context.js';
import { ModuleError } from './errors.js';

/** A Zod object schema describing a module's required/optional config. */
export type ConfigSchema = z.ZodObject<z.ZodRawShape>;

/** The MCP resource URI an Odel module exposes to advertise its config. */
export const ODEL_CONFIG_URI = 'odel://config';

/** One declared config field, as published in the `odel://config` manifest. */
export interface DeclaredSecret {
	name: string;
	description: string;
	required: boolean;
}

function readSecrets(extra: HandlerExtraLike): Record<string, string> {
	const meta = (extra?._meta as Record<string, unknown> | undefined) ?? {};
	return (meta[SECRETS_META_KEY] as Record<string, string> | undefined) ?? {};
}

/**
 * Validate the per-user secrets envelope against a declared `configSchema` and
 * return the typed, validated config.
 *
 * @throws {ModuleError} `MISSING_SECRET` when a required key is absent, or
 *   `INVALID_SECRET` when a present value fails the schema (e.g. wrong format).
 *
 * @example
 * ```typescript
 * const cfg = parseConfig(configSchema, extra);
 * await send(cfg.RESEND_API_KEY); // typed as string
 * ```
 */
export function parseConfig<S extends ConfigSchema>(configSchema: S, extra: HandlerExtraLike): z.infer<S> {
	const secrets = readSecrets(extra);
	const result = configSchema.safeParse(secrets);
	if (!result.success) {
		const issue = result.error.issues[0];
		const name = issue?.path?.length ? String(issue.path[0]) : 'config';
		// Distinguish "missing" from "present-but-invalid" by checking the
		// raw envelope — robust across zod v3/v4 issue-shape differences.
		if (!(name in secrets)) {
			throw ModuleError.missingSecret(name);
		}
		throw ModuleError.invalidSecret(name, issue?.message);
	}
	return result.data;
}

/**
 * The names of the required (non-optional) fields declared by a `configSchema`.
 *
 * This is the exact array a dev-portal build step writes into the module's
 * `requiredSecretsJson`, keeping the runtime check and the published manifest
 * in lockstep.
 *
 * @example
 * ```typescript
 * configRequiredSecretNames(z.object({
 *   API_KEY: z.string(),
 *   DEBUG: z.string().optional(),
 * })); // -> ['API_KEY']
 * ```
 */
export function configRequiredSecretNames(configSchema: ConfigSchema): string[] {
	const shape = configSchema.shape;
	return Object.keys(shape).filter(key => {
		const field = shape[key] as z.ZodTypeAny;
		return typeof field.isOptional === 'function' ? !field.isOptional() : true;
	});
}

/**
 * Build the `odel://config` manifest (`{ name, description, required }[]`) from
 * a config schema. Returns `[]` when no schema is declared.
 */
export function buildConfigManifest(configSchema?: ConfigSchema): DeclaredSecret[] {
	if (!configSchema) return [];
	return Object.entries(configSchema.shape).map(([name, field]) => {
		const f = field as z.ZodTypeAny;
		return { name, description: f.description ?? '', required: typeof f.isOptional === 'function' ? !f.isOptional() : true };
	});
}

/**
 * Register the `odel://config` resource on a server.
 *
 * This resource is the **marker that identifies an Odel module** — it is always
 * present, even when the module declares no config (`{ secrets: [] }`), so Odel
 * tooling (the inspector, …) can distinguish Odel servers from plain MCP servers
 * and read the declared config to drive secret-entry UI.
 *
 * Prefer `createOdelServer` (from `@odel/module-sdk/server`), which calls this
 * automatically; use this directly only if you construct `McpServer` yourself.
 */
export function registerOdelConfig(server: McpServer, configSchema?: ConfigSchema): void {
	const secrets = buildConfigManifest(configSchema);
	server.registerResource(
		'odel-config',
		ODEL_CONFIG_URI,
		{ title: 'Odel module config', description: 'Config/secrets this Odel module declares', mimeType: 'application/json' },
		async (uri: URL) => ({
			contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ secrets }, null, 2) }]
		})
	);
}
