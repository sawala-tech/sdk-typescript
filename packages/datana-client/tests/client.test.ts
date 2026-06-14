import { describe, it, expect } from 'vitest'
import { createDatanaClient } from '../src'

const PROJ = 'proj_test'
const BASE = 'https://api.sawala.cloud/public/datana'

// A fake fetch: matches the longest registered route prefix, records calls.
function mockFetch(routes: Record<string, { status?: number; body: unknown }>) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = []
  const impl = (async (input: unknown, init?: { headers?: Record<string, string> }) => {
    const url = String(input)
    calls.push({ url, headers: { ...(init?.headers ?? {}) } })
    const key = Object.keys(routes)
      .filter((k) => url.split('?')[0] === k)
      .sort((a, b) => b.length - a.length)[0]
    const r = key ? routes[key]! : { status: 404, body: {} }
    return new Response(JSON.stringify(r.body), {
      status: r.status ?? 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
  return { impl, calls }
}

const mk = (impl: typeof fetch) => createDatanaClient({ projectId: PROJ, publicApiKey: 'pk_live_x', fetchImpl: impl })

describe('createDatanaClient', () => {
  it('listRecords sends X-API-Key, serializes filters (repeatable) + q', async () => {
    const { impl, calls } = mockFetch({
      [`${BASE}/projects/${PROJ}/collections/startup/records`]: {
        body: { data: [{ id: '1', data: { title: 'A' }, status: 'published', createdAt: '', updatedAt: '' }], meta: { pagination: { limit: 20, hasMore: false } } },
      },
    })
    const { items, pagination } = await mk(impl).listRecords<{ title: string }>('startup', {
      filter: { industry_sector: 'fintech', city: 'x' },
      q: 'bot',
      limit: 20,
    })
    expect(items[0]?.data.title).toBe('A')
    expect(pagination.hasMore).toBe(false)
    const u = calls[0]!.url
    expect(u).toContain('filter=industry_sector%3Afintech')
    expect(u).toContain('filter=city%3Ax')
    expect(u).toContain('q=bot')
    expect(u).toContain('limit=20')
    expect(calls[0]!.headers['X-API-Key']).toBe('pk_live_x')
  })

  it('listRecords accepts raw filter strings (in:/gte:)', async () => {
    const { impl, calls } = mockFetch({
      [`${BASE}/projects/${PROJ}/collections/startup/records`]: { body: { data: [], meta: { pagination: { limit: 25, hasMore: false } } } },
    })
    await mk(impl).listRecords('startup', { filter: ['sector:in:edu,fintech'] })
    expect(calls[0]!.url).toContain('filter=sector%3Ain%3Aedu%2Cfintech')
  })

  it('getRecord returns null on 404', async () => {
    const { impl } = mockFetch({})
    expect(await mk(impl).getRecord('startup', 'nope')).toBeNull()
  })

  it('getCollection returns the schema', async () => {
    const { impl } = mockFetch({
      [`${BASE}/projects/${PROJ}/collections/startup`]: {
        body: { id: 'c', slug: 'startup', name: 'Startup', fields: [{ name: 'title', type: 'text', required: true }], visibility: 'public' },
      },
    })
    const col = await mk(impl).getCollection('startup')
    expect(col?.name).toBe('Startup')
    expect(col?.fields[0]?.name).toBe('title')
  })

  it('aggregate serializes count/groupBy/distinct', async () => {
    const { impl, calls } = mockFetch({
      [`${BASE}/projects/${PROJ}/collections/startup/aggregate`]: { body: { total: 501, groups: { 'dki-jakarta': 119 } } },
    })
    const a = await mk(impl).aggregate('startup', { count: true, groupBy: 'province', distinct: ['city'] })
    expect(a.total).toBe(501)
    expect(a.groups?.['dki-jakarta']).toBe(119)
    const u = calls[0]!.url
    expect(u).toContain('count=true')
    expect(u).toContain('groupBy=province')
    expect(u).toContain('distinct=city')
  })

  it('throws on a non-404 error response', async () => {
    const { impl } = mockFetch({ [`${BASE}/projects/${PROJ}/collections/startup/records`]: { status: 500, body: { error: 'kaboom' } } })
    await expect(mk(impl).listRecords('startup')).rejects.toThrow(/500/)
  })
})

// Opt-in live smoke against the deployed TND public API. Skipped unless
// DATANA_TEST_KEY is set. Run: DATANA_TEST_KEY=pk_live_… npm test
const LIVE = process.env.DATANA_TEST_KEY
describe.skipIf(!LIVE)('live smoke (TND)', () => {
  const client = createDatanaClient({ projectId: 'proj_HSCj4-_vlh6B', publicApiKey: LIVE ?? '' })
  it('aggregate groupBy province sums to the startup total', async () => {
    const agg = await client.aggregate('startup', { count: true, groupBy: 'province' })
    const sum = Object.values(agg.groups ?? {}).reduce((a, b) => a + b, 0)
    // groups sum ≤ total (records without a province aren't grouped).
    expect(agg.total).toBeGreaterThanOrEqual(500)
    expect(sum).toBeGreaterThan(400)
    expect(sum).toBeLessThanOrEqual(agg.total ?? 0)
  })
  it('lists SDG taxonomy with images', async () => {
    const { items } = await client.listRecords<{ title: string; image?: string }>('related-sd-gs', { limit: 100 })
    expect(items.length).toBeGreaterThan(10)
    expect(items.filter((r) => r.data.image).length).toBeGreaterThanOrEqual(10)
  })
})
