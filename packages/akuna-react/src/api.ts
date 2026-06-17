// Thin fetch helper for the public Akuna API. Browser-only — modern React
// targets (Next.js, Vite, Remix, plain CDN) all have global fetch.

import type { AkunaConfig, AkunaError } from './types'

interface ApiContext {
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
  return res.json() as Promise<AkunaConfig>
}
