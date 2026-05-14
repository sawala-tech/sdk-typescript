// Thin fetch helpers for the public Formulir API.
//
// The package is browser-only. There is no Node fetch polyfill; modern React
// targets (18+) on the supported runtimes (Next.js, Vite, Remix, plain CDN)
// all have global fetch.

import type { Form, FormulirError, SubmissionResult } from './types'

interface ApiContext {
  apiKey:  string
  baseUrl: string
}

function isFormulirError(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value &&
    typeof (value as { error: unknown }).error === 'string'
}

async function parseError(res: Response): Promise<FormulirError> {
  let code = `HTTP_${res.status}`
  try {
    const body = await res.json()
    if (isFormulirError(body)) code = body.error
  } catch {
    // Non-JSON body — fall through to the default code.
  }
  return {
    code,
    message: humanMessage(res.status, code),
    status:  res.status,
  }
}

function humanMessage(status: number, code: string): string {
  if (status === 401) return 'Invalid or expired API key.'
  if (status === 403) {
    if (code === 'FORM_PRIVATE')                  return 'This form is not accepting submissions right now.'
    if (code === 'API_KEY_REQUIRES_PROJECT_SCOPE') return 'The API key must be project-scoped.'
    return 'This origin is not allowed to submit to this form.'
  }
  if (status === 404) return 'Form not found.'
  if (status === 413) return 'The submission exceeds the maximum allowed size.'
  if (status === 429) return 'Too many submissions — please try again in a minute.'
  if (status >= 500)  return 'The form service is temporarily unavailable.'
  return code
}

export async function fetchFormDefinition(
  ctx:  ApiContext,
  slug: string,
): Promise<Form> {
  const res = await fetch(`${ctx.baseUrl}/forms/${encodeURIComponent(slug)}`, {
    method:  'GET',
    headers: {
      'accept':    'application/json',
      'x-api-key': ctx.apiKey,
    },
  })
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<Form>
}

export async function submitForm(
  ctx:    ApiContext,
  slug:   string,
  values: Record<string, unknown>,
  files:  Record<string, File>,
): Promise<SubmissionResult> {
  const formData = new FormData()

  for (const [name, value] of Object.entries(values)) {
    if (value == null) continue
    if (typeof value === 'boolean') {
      // Match the iframe widget contract — boolean fields post 'true' or are absent.
      if (value) formData.append(name, 'true')
      continue
    }
    if (Array.isArray(value)) {
      for (const v of value) formData.append(name, String(v))
      continue
    }
    if (value instanceof File) {
      formData.append(name, value)
      continue
    }
    if (typeof value === 'object') {
      formData.append(name, JSON.stringify(value))
      continue
    }
    formData.append(name, String(value))
  }
  for (const [name, file] of Object.entries(files)) {
    if (file && file.size > 0) formData.append(name, file)
  }

  const res = await fetch(`${ctx.baseUrl}/forms/${encodeURIComponent(slug)}/submit`, {
    method:  'POST',
    headers: {
      // The gateway's apiKeyAuth() reads X-API-Key (case-insensitive). Content-Type
      // is intentionally omitted so the browser sets the multipart boundary.
      'x-api-key':     ctx.apiKey,
      'x-source-hint': 'react',
    },
    body: formData,
  })
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<SubmissionResult>
}
