import type {
  SebarClientOptions,
  SendEmailInput,
  SendEmailResult,
} from './types'

/**
 * Production base URL of the Sebar public send API. Used when a caller does
 * not pass {@link SebarClientOptions.baseUrl}. This host is a platform
 * invariant for every managed-cloud customer; only the secret key differs.
 */
const DEFAULT_BASE_URL = 'https://api.sawala.cloud/public/sebar'

/**
 * A typed, server-side client for Sebar's email send API.
 *
 * Created via {@link createSebarClient}. Send mail with
 * {@link SebarClient.emails}.`send(...)`.
 */
export interface SebarClient {
  emails: {
    /**
     * Send (enqueue) one email.
     *
     * Resolves to `{ status: 'queued', id }` when accepted (HTTP 202) or
     * `{ status: 'suppressed', id, reason }` when the recipient is suppressed
     * (HTTP 409). Throws {@link SebarApiError} for any other non-2xx response
     * (e.g. `SECRET_KEY_REQUIRED` 403, `RATE_LIMITED` 429, template-not-found
     * 404, validation 400, unauthorized 401).
     *
     * @example
     * const r = await sebar.emails.send({
     *   to: { email: 'you@example.com' },
     *   templateId: 'welcome',
     *   variables: { name: 'Sutisna' },
     * })
     * if (r.status === 'queued') console.log('sent', r.id)
     */
    send(input: SendEmailInput): Promise<SendEmailResult>
  }
}

/**
 * Thrown by {@link SebarClient.emails}.`send(...)` for any non-2xx response
 * other than a 409 suppression. Carries the HTTP `status`, the backend error
 * `code` (e.g. `'SECRET_KEY_REQUIRED'`, `'RATE_LIMITED'`, `'TEMPLATE_NOT_FOUND'`),
 * and an optional human `hint`.
 */
export class SebarApiError extends Error {
  readonly status: number
  readonly code: string
  readonly hint?: string

  constructor(status: number, code: string, hint?: string) {
    super(`Sebar ${status} ${code}${hint ? `: ${hint}` : ''}`)
    this.name = 'SebarApiError'
    this.status = status
    this.code = code
    if (hint !== undefined) this.hint = hint
  }
}

// The secret key travels in the X-API-Key header. A cleartext base would
// expose the key and message content on the network path, so require https —
// http is allowed only for a local loopback host (local backend / tunnel dev).
function assertSecureBaseUrl(base: string): void {
  let parsed: URL
  try {
    parsed = new URL(base)
  } catch {
    throw new Error(`Invalid baseUrl: ${base}`)
  }
  const loopback =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '::1' ||
    parsed.hostname.endsWith('.localhost')
  if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && loopback)) return
  throw new Error(
    `Refusing an insecure baseUrl (${base}). Use https:// — http:// is allowed only for localhost.`,
  )
}

/**
 * Create a server-side Sebar send client authenticated with a secret key.
 *
 * Throws immediately if a browser environment is detected (`window` or
 * `document` present): the client uses a secret key, which must never be
 * shipped to a browser. Keep the key in a server-only secret.
 *
 * @example
 * import { createSebarClient } from '@sawala/sebar-client'
 *
 * const sebar = createSebarClient({ apiKey: process.env.SEBAR_SECRET_KEY! })
 * await sebar.emails.send({ to: { email: 'you@example.com' }, templateId: 'welcome' })
 */
export function createSebarClient(opts: SebarClientOptions): SebarClient {
  // Server-only guard. A secret key in client code is a credential leak; fail
  // loudly rather than let it be bundled into a browser build.
  if (typeof window !== 'undefined' || typeof document !== 'undefined') {
    throw new Error(
      'The Sebar SDK uses a secret key and must run on a server, not in the browser. ' +
        'Keep the key in a server-only secret (e.g. process.env.SEBAR_SECRET_KEY), never a NEXT_PUBLIC_ variable.',
    )
  }

  const base = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  assertSecureBaseUrl(base)
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch

  async function send(input: SendEmailInput): Promise<SendEmailResult> {
    const res = await fetchImpl(`${base}/notifications/send`, {
      method: 'POST',
      headers: {
        'X-API-Key': opts.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(input),
    })

    // Backend contract (services/sebar/src/routes/public.ts):
    //   202 { id, status }                          -> queued
    //   409 { id, error: 'SUPPRESSED', reason }     -> suppressed
    //   4xx { error, hint? }                        -> throw
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

    if (res.status === 202) {
      return { status: 'queued', id: String(data.id ?? '') }
    }
    if (res.status === 409) {
      return {
        status: 'suppressed',
        id: String(data.id ?? ''),
        reason: String(data.reason ?? 'suppressed'),
      }
    }
    throw new SebarApiError(
      res.status,
      typeof data.error === 'string' ? data.error : `HTTP_${res.status}`,
      typeof data.hint === 'string' ? data.hint : undefined,
    )
  }

  return { emails: { send } }
}
