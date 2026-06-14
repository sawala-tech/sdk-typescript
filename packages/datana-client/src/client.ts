import type {
  AggregateParams,
  AggregateResult,
  DatanaClient,
  DatanaClientOptions,
  DatanaCollection,
  DatanaPagination,
  DatanaRecord,
  ListRecordsParams,
} from './types'

/** Production base URL of the Datana public read API. A platform invariant for
 * every managed-cloud customer; only `projectId` and `publicApiKey` differ. */
const DEFAULT_BASE_URL = 'https://api.sawala.cloud/public/datana'

/**
 * Create a typed client for Datana's public read API.
 *
 * @example
 * const datana = createDatanaClient({ projectId: 'proj_…', publicApiKey: 'pk_live_…' })
 * const { items, pagination } = await datana.listRecords<Startup>('startup', { filter: { industry_sector: 'fintech' }, limit: 20 })
 * const regions = await datana.aggregate('startup', { groupBy: 'province' })
 */
export function createDatanaClient(opts: DatanaClientOptions): DatanaClient {
  const base = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  const headers: HeadersInit = { 'X-API-Key': opts.publicApiKey }
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch

  const build = (path: string, qs?: URLSearchParams): string => {
    const q = qs && [...qs.keys()].length > 0 ? `?${qs.toString()}` : ''
    return `${base}/projects/${opts.projectId}${path}${q}`
  }

  // GET that maps 404 → null and throws on any other non-2xx.
  const getJson = async (u: string): Promise<unknown | null> => {
    const res = await fetchImpl(u, { headers })
    if (res.status === 404) return null
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Datana request failed: ${res.status}${detail ? ` ${detail}` : ''}`)
    }
    return (await res.json()) as unknown
  }

  return {
    async getCollection(collection: string): Promise<DatanaCollection | null> {
      const body = await getJson(build(`/collections/${collection}`))
      return body as DatanaCollection | null
    },

    async listRecords<T = Record<string, unknown>>(
      collection: string,
      params?: ListRecordsParams,
    ): Promise<{ items: Array<DatanaRecord<T>>; pagination: DatanaPagination }> {
      const qs = new URLSearchParams()
      if (params?.limit != null) qs.set('limit', String(params.limit))
      if (params?.cursor) qs.set('cursor', params.cursor)
      if (params?.sort) qs.set('sort', params.sort)
      if (params?.q) qs.set('q', params.q)
      if (params?.filter) {
        if (Array.isArray(params.filter)) {
          for (const f of params.filter) qs.append('filter', f)
        } else {
          for (const [k, v] of Object.entries(params.filter)) qs.append('filter', `${k}:${v}`)
        }
      }
      const body = await getJson(build(`/collections/${collection}/records`, qs))
      if (body == null) return { items: [], pagination: { limit: params?.limit ?? 25, hasMore: false } }
      const b = body as { data: Array<DatanaRecord<T>>; meta: { pagination: DatanaPagination } }
      return { items: b.data, pagination: b.meta.pagination }
    },

    async getRecord<T = Record<string, unknown>>(collection: string, id: string): Promise<DatanaRecord<T> | null> {
      const body = await getJson(build(`/collections/${collection}/records/${id}`))
      return body as DatanaRecord<T> | null
    },

    async aggregate(collection: string, params: AggregateParams): Promise<AggregateResult> {
      const qs = new URLSearchParams()
      if (params.count) qs.set('count', 'true')
      if (params.groupBy) qs.set('groupBy', params.groupBy)
      if (params.distinct && params.distinct.length > 0) qs.set('distinct', params.distinct.join(','))
      const body = await getJson(build(`/collections/${collection}/aggregate`, qs))
      return (body ?? {}) as AggregateResult
    },
  }
}
