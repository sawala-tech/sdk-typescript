import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createKontenaClient } from '../src'
import singleSiteSettings from './fixtures/single.site-settings.id.json'
import collectionPost from './fixtures/collection.post.id.json'

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
  http.get(`${BASE}/projects/${PROJ}/content/collection/post`, () =>
    HttpResponse.json(collectionPost),
  ),
  http.get(`${BASE}/projects/${PROJ}/content/collection/empty`, () =>
    HttpResponse.json({}, { status: 404 }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('createKontenaClient baseUrl security', () => {
  it('rejects an insecure (http, non-localhost) baseUrl', () => {
    expect(() =>
      createKontenaClient({ baseUrl: 'http://evil.example.com', projectId: PROJ, publicApiKey: 'pk_live_x' }),
    ).toThrow(/insecure baseUrl/i)
  })

  it('allows https and http-localhost', () => {
    expect(() =>
      createKontenaClient({ baseUrl: 'https://api.example.com', projectId: PROJ, publicApiKey: 'pk_live_x' }),
    ).not.toThrow()
    expect(() =>
      createKontenaClient({ baseUrl: 'http://localhost:8787', projectId: PROJ, publicApiKey: 'pk_live_x' }),
    ).not.toThrow()
  })
})

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

  it('defaults baseUrl to the production public API when none is given', async () => {
    let requestedUrl: string | null = null
    server.use(
      http.get(`${BASE}/projects/${PROJ}/content/single/site-settings`, ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.json(singleSiteSettings)
      }),
    )
    // No baseUrl supplied — must fall back to https://api.sawala.cloud/public/kontena
    const defaulted = createKontenaClient({
      projectId: PROJ,
      publicApiKey: 'pk_live_REDACTED',
    })
    const entry = await defaulted.getSingle('site-settings', 'id')
    expect(entry).not.toBeNull()
    expect(requestedUrl).not.toBeNull()
    expect(requestedUrl!).toMatch(
      /^https:\/\/api\.sawala\.cloud\/public\/kontena\/projects\/proj_test123\/content\/single\/site-settings/,
    )
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

  it('listCollection unwraps rows and surfaces pagination', async () => {
    interface Post {
      title: string
      body: string
    }
    const { items, pagination } = await client.listCollection<Post>('post', { locale: 'id', limit: 10 })
    expect(items).toHaveLength(2)
    expect(items[0]?.title).toBe('Halo Dunia')
    expect(items[0]?._row.slug).toBe('halo-dunia')
    expect(items[0]?._row.status).toBe('published')
    expect(pagination.hasMore).toBe(true)
    expect(pagination.nextCursor).toBe('cursor_page_2')
  })

  it('listCollection forwards locale, limit, cursor, fields, and q params', async () => {
    let received: URLSearchParams | null = null
    server.use(
      http.get(`${BASE}/projects/${PROJ}/content/collection/peek`, ({ request }) => {
        received = new URL(request.url).searchParams
        return HttpResponse.json(collectionPost)
      }),
    )
    await client.listCollection('peek', {
      locale: 'en',
      limit: 5,
      cursor: 'cur_abc',
      fields: ['title', 'slug'],
      q: 'hello',
    })
    expect(received).not.toBeNull()
    expect(received!.get('locale')).toBe('en')
    expect(received!.get('limit')).toBe('5')
    expect(received!.get('cursor')).toBe('cur_abc')
    expect(received!.get('fields')).toBe('title,slug')
    expect(received!.get('q')).toBe('hello')
    expect(received!.get('format')).toBe('strapi-v5')
  })

  it('listCollection returns an empty list (not throw) for a 404 collection', async () => {
    const { items, pagination } = await client.listCollection('empty', { limit: 7 })
    expect(items).toEqual([])
    expect(pagination.hasMore).toBe(false)
    expect(pagination.limit).toBe(7)
  })

  it('getCollectionEntry resolves an entry by slug', async () => {
    interface Post {
      title: string
    }
    const entry = await client.getCollectionEntry<Post>('post', 'kabar-kedua', 'id')
    expect(entry).not.toBeNull()
    expect(entry?.title).toBe('Kabar Kedua')
    expect(entry?._row.slug).toBe('kabar-kedua')
  })

  it('getCollectionEntry returns null when no slug matches', async () => {
    const entry = await client.getCollectionEntry('post', 'does-not-exist', 'id')
    expect(entry).toBeNull()
  })
})
