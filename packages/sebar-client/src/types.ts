/**
 * An email address with an optional display name, as accepted by every
 * address field on a Sebar send (`to`, `from`, `replyTo`).
 *
 * @example
 * { email: 'you@example.com', name: 'You' }
 */
export interface EmailAddress {
  email: string
  name?: string
}

/**
 * Options for {@link createSebarClient}.
 *
 * The API key is a **secret** key (`sk_live_…`). It carries the org and
 * project (Sawala API keys are project-scoped), so the client takes no
 * `projectId` — the send is always created under the key's own org/project.
 *
 * Because a secret key must never reach a browser, the client refuses to run
 * in a browser context (see {@link createSebarClient}). Keep the key in a
 * server-only secret (e.g. `process.env.SEBAR_SECRET_KEY`), never a
 * `NEXT_PUBLIC_…`/client-inlined variable.
 */
export interface SebarClientOptions {
  /** A secret key minted for your project: `'sk_live_…'`. Server-only. */
  apiKey: string
  /** Override the API host. Defaults to `'https://api.sawala.cloud/public/sebar'`. */
  baseUrl?: string
  /** Inject a custom `fetch` (tests, proxies). Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch
}

/**
 * Input for {@link SebarClient.emails.send}.
 *
 * Either supply a `templateId` (a template authored in the Sebar dashboard),
 * or supply an inline `subject` plus at least one of `bodyHtml` / `bodyText`.
 * Mirrors the backend's `SendMessageBody` exactly.
 */
export interface SendEmailInput {
  to: EmailAddress
  from?: EmailAddress
  replyTo?: EmailAddress
  /** Use a dashboard-authored template. Alternative to inline subject + body. */
  templateId?: string
  /** Inline subject. Required (with a body) when no `templateId` is given. */
  subject?: string
  bodyHtml?: string
  bodyText?: string
  /** `{{variable}}` substitutions interpolated into the template or inline body. */
  variables?: Record<string, string | number | boolean>
  /** Caller tags stored on the message metadata (not the Postmark stream tag). */
  tags?: string[]
  metadata?: Record<string, string>
}

/**
 * Result of a successful {@link SebarClient.emails.send}.
 *
 * `'queued'` — the message was accepted and enqueued for delivery (HTTP 202).
 * `'suppressed'` — the recipient is on the org's suppression list, so nothing
 * was sent; `reason` explains why (e.g. `'hard_bounce'`) (HTTP 409).
 *
 * Any other non-2xx response throws a {@link SebarApiError} instead.
 */
export type SendEmailResult =
  | { status: 'queued'; id: string }
  | { status: 'suppressed'; id: string; reason: string }
