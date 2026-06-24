import { describe, it, expect, afterEach } from 'vitest'
import { createSebarClient, SebarApiError } from '../src'

const BASE = 'https://api.sawala.cloud/public/sebar'
const KEY = 'sk_live_REDACTED'

// Build a fetch stub that returns a canned response and records the request it
// received, so a test can assert URL, method, headers, and body.
function stubFetch(status: number, body: unknown) {
  const calls: { url: string; init?: RequestInit }[] = []
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
  return { impl, calls }
}

afterEach(() => {
  // Clean up any browser-guard globals a test installed.
  delete (globalThis as Record<string, unknown>).window
  delete (globalThis as Record<string, unknown>).document
})

describe('createSebarClient guards', () => {
  it('rejects an insecure (http, non-localhost) baseUrl', () => {
    expect(() =>
      createSebarClient({ apiKey: KEY, baseUrl: 'http://evil.example.com' }),
    ).toThrow(/insecure baseUrl/i)
  })

  it('allows https and http-localhost', () => {
    expect(() =>
      createSebarClient({ apiKey: KEY, baseUrl: 'https://api.example.com' }),
    ).not.toThrow()
    expect(() =>
      createSebarClient({ apiKey: KEY, baseUrl: 'http://localhost:8787' }),
    ).not.toThrow()
  })

  it('throws the server-only error when a browser global is present', () => {
    ;(globalThis as Record<string, unknown>).window = {}
    expect(() => createSebarClient({ apiKey: KEY })).toThrow(
      /must run on a server, not in the browser/i,
    )
  })
})

describe('sebar.emails.send', () => {
  it('maps a 202 to a queued result', async () => {
    const { impl } = stubFetch(202, { id: 'm1', status: 'queued' })
    const sebar = createSebarClient({ apiKey: KEY, fetchImpl: impl })
    const r = await sebar.emails.send({ to: { email: 'you@example.com' }, templateId: 't1' })
    expect(r).toEqual({ status: 'queued', id: 'm1' })
  })

  it('maps a 409 to a suppressed result with reason', async () => {
    const { impl } = stubFetch(409, { id: 'm2', error: 'SUPPRESSED', reason: 'hard_bounce' })
    const sebar = createSebarClient({ apiKey: KEY, fetchImpl: impl })
    const r = await sebar.emails.send({ to: { email: 'you@example.com' }, templateId: 't1' })
    expect(r).toEqual({ status: 'suppressed', id: 'm2', reason: 'hard_bounce' })
  })

  it('throws SebarApiError with status 403 and code SECRET_KEY_REQUIRED', async () => {
    const { impl } = stubFetch(403, { error: 'SECRET_KEY_REQUIRED' })
    const sebar = createSebarClient({ apiKey: KEY, fetchImpl: impl })
    await expect(
      sebar.emails.send({ to: { email: 'you@example.com' }, templateId: 't1' }),
    ).rejects.toMatchObject({ name: 'SebarApiError', status: 403, code: 'SECRET_KEY_REQUIRED' })
  })

  it('throws SebarApiError with status 429 when rate-limited', async () => {
    const { impl } = stubFetch(429, { error: 'RATE_LIMITED' })
    const sebar = createSebarClient({ apiKey: KEY, fetchImpl: impl })
    const err = await sebar.emails
      .send({ to: { email: 'you@example.com' }, templateId: 't1' })
      .catch((e) => e)
    expect(err).toBeInstanceOf(SebarApiError)
    expect(err.status).toBe(429)
    expect(err.code).toBe('RATE_LIMITED')
  })

  it('surfaces the backend hint on errors', async () => {
    const { impl } = stubFetch(404, { error: 'TEMPLATE_NOT_FOUND', hint: 'no template t1' })
    const sebar = createSebarClient({ apiKey: KEY, fetchImpl: impl })
    const err = (await sebar.emails
      .send({ to: { email: 'you@example.com' }, templateId: 't1' })
      .catch((e) => e)) as SebarApiError
    expect(err.status).toBe(404)
    expect(err.code).toBe('TEMPLATE_NOT_FOUND')
    expect(err.hint).toBe('no template t1')
  })

  it('POSTs to /notifications/send with X-API-Key and a JSON body matching the input', async () => {
    const { impl, calls } = stubFetch(202, { id: 'm9', status: 'queued' })
    const sebar = createSebarClient({ apiKey: KEY, fetchImpl: impl })
    const input = {
      to: { email: 'you@example.com', name: 'You' },
      templateId: 'welcome',
      variables: { name: 'Sutisna' },
      tags: ['onboarding'],
    }
    await sebar.emails.send(input)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe(`${BASE}/notifications/send`)
    expect(calls[0]!.init?.method).toBe('POST')
    const headers = calls[0]!.init?.headers as Record<string, string>
    expect(headers['X-API-Key']).toBe(KEY)
    expect(headers['content-type']).toBe('application/json')
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual(input)
  })

  it('defaults the base URL to the production public Sebar API', async () => {
    const { impl, calls } = stubFetch(202, { id: 'm0', status: 'queued' })
    const sebar = createSebarClient({ apiKey: KEY, fetchImpl: impl })
    await sebar.emails.send({ to: { email: 'you@example.com' }, templateId: 't1' })
    expect(calls[0]!.url).toBe('https://api.sawala.cloud/public/sebar/notifications/send')
  })
})
