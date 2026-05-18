import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createKontenaClient } from '../src'
import singleSiteSettings from './fixtures/single.site-settings.id.json'

const BASE = 'https://api.sawala.cloud/public/kontena'
const PROJ = 'proj_test123'

const server = setupServer(
  http.get(`${BASE}/projects/${PROJ}/content/single/site-settings`, () =>
    HttpResponse.json(singleSiteSettings),
  ),
  http.get(`${BASE}/projects/${PROJ}/content/single/missing`, () =>
    HttpResponse.json({}, { status: 404 }),
  ),
  http.get(`${BASE}/projects/${PROJ}/content/single/error`, () =>
    HttpResponse.json({ error: 'kaboom' }, { status: 500 }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('createKontenaClient', () => {
  const client = createKontenaClient({
    baseUrl: BASE,
    projectId: PROJ,
    publicApiKey: 'pk_live_REDACTED',
  })

  it('getSingle unwraps row.data into top-level fields and preserves system columns under _row', async () => {
    interface SiteSettings {
      siteName: string
      tagline: string
    }
    const entry = await client.getSingle<SiteSettings>('site-settings', 'id')
    expect(entry).not.toBeNull()
    expect(entry?.siteName).toBe('Acme')
    expect(entry?.tagline).toBe('Build with Sawala')
    expect(entry?._row.locale).toBe('id')
    expect(entry?._row.status).toBe('published')
    expect(entry?._row.id).toBe('ckpw5o8a40000xyz')
  })

  it('returns null for missing single entries (404)', async () => {
    const entry = await client.getSingle('missing', 'id')
    expect(entry).toBeNull()
  })

  it('throws on non-2xx, non-404 errors', async () => {
    await expect(client.getSingle('error', 'id')).rejects.toThrow(/Kontena 500/)
  })

  it('accepts a custom fetchImpl', async () => {
    let invoked = 0
    const custom = createKontenaClient({
      baseUrl: BASE,
      projectId: PROJ,
      publicApiKey: 'pk_live_REDACTED',
      fetchImpl: async (...args) => {
        invoked++
        return fetch(...args)
      },
    })
    await custom.getSingle('site-settings', 'id')
    expect(invoked).toBe(1)
  })

  it('sends the X-API-Key header and the strapi-v5 format param', async () => {
    let receivedHeader: string | null = null
    let receivedFormat: string | null = null
    server.use(
      http.get(`${BASE}/projects/${PROJ}/content/single/peek`, ({ request }) => {
        receivedHeader = request.headers.get('x-api-key')
        receivedFormat = new URL(request.url).searchParams.get('format')
        return HttpResponse.json(singleSiteSettings)
      }),
    )
    await client.getSingle('peek', 'id')
    expect(receivedHeader).toBe('pk_live_REDACTED')
    expect(receivedFormat).toBe('strapi-v5')
  })
})
