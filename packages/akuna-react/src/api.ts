// Thin fetch helper for the public Akuna API. Browser-only — modern React
// targets (Next.js, Vite, Remix, plain CDN) all have global fetch.
//
// Header convention (load-bearing, fixed by the platform): the Sawala api key
// ALWAYS travels in `x-api-key`; `Authorization: Bearer` is reserved for the
// managed member session JWT. One request may carry both.

import type { AkunaConfig, AkunaError, Member } from './types'

export interface ApiContext {
  apiKey: string
  baseUrl: string
}

function isAkunaError(value: unknown): value is { error: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as { error: unknown }).error === 'string'
  )
}

async function parseError(res: Response): Promise<AkunaError> {
  let code = `HTTP_${res.status}`
  try {
    const body = await res.json()
    if (isAkunaError(body)) code = body.error
  } catch {
    // Non-JSON body — keep the default code.
  }
  return { code, message: humanMessage(res.status, code), status: res.status }
}

function humanMessage(status: number, code: string): string {
  if (status === 401) return 'Invalid or expired API key.'
  if (status === 403) return 'This API key is not scoped for Akuna, or this origin is not allowed.'
  if (status === 404 && code === 'NO_ACTIVE_CONNECTION') {
    return 'No membership connection is configured for this project yet.'
  }
  if (status >= 500) return 'The membership service is temporarily unavailable.'
  return code
}

export async function fetchConfig(ctx: ApiContext): Promise<AkunaConfig> {
  const res = await fetch(`${ctx.baseUrl}/config`, {
    method: 'GET',
    headers: { accept: 'application/json', 'x-api-key': ctx.apiKey },
  })
  if (!res.ok) throw await parseError(res)
  const body = (await res.json()) as AkunaConfig & { mode?: 'managed' | 'byo' }
  // Backends that predate the managed flow return the BYO shape with no `mode`.
  if (body.mode !== 'managed' && body.mode !== 'byo') {
    return { ...(body as object), mode: 'byo' } as AkunaConfig
  }
  return body
}

/**
 * Managed flow: exchange the single-use authorization code (from the
 * ?code=… redirect) for a short-lived member session JWT plus the profile.
 */
export async function exchangeToken(
  ctx: ApiContext,
  code: string,
): Promise<{ token: string; member: Member }> {
  const res = await fetch(`${ctx.baseUrl}/auth/token`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-api-key': ctx.apiKey,
    },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<{ token: string; member: Member }>
}

/**
 * Managed flow: verify the stored member session JWT and return the current
 * membership. Returns null on 401 (missing/expired/revoked/banned) so callers
 * can treat it as an ordinary signed-out state rather than an error.
 */
export async function fetchMe(
  ctx: ApiContext,
  token: string,
): Promise<{ isMember: boolean; member: Member } | null> {
  const res = await fetch(`${ctx.baseUrl}/auth/me`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-api-key': ctx.apiKey,
      authorization: `Bearer ${token}`,
    },
  })
  if (res.status === 401) return null
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<{ isMember: boolean; member: Member }>
}
