import type {
  KontenaClientOptions,
  KontenaEntry,
  KontenaLocale,
  KontenaPagination,
  KontenaSystemColumns,
  ListCollectionParams,
} from './types'

/**
 * Production base URL of the Kontena public read API. Used when a caller does
 * not pass {@link KontenaClientOptions.baseUrl}. This host is a platform
 * invariant for every managed-cloud customer and serves both `pk_test_…` and
 * `pk_live_…` tokens; only `projectId` and `publicApiKey` differ per project.
 */
const DEFAULT_BASE_URL = 'https://api.sawala.cloud/public/kontena'

/**
 * A typed client for Kontena's public read API.
 *
 * Created via {@link createKontenaClient}. Single-type reads use
 * {@link KontenaClient.getSingle}; collection (multi-entry) schemas use
 * {@link KontenaClient.listCollection} for paginated lists and
 * {@link KontenaClient.getCollectionEntry} to resolve one entry by slug.
 */
export interface KontenaClient {
  /**
   * Fetch the single entry for a single-type schema in the given locale.
   *
   * Returns `null` if the schema has no entry for that locale (404 from the
   * backend); throws for any other non-2xx response.
   *
   * @example
   * interface SiteSettings { siteName: string }
   * const settings = await kontena.getSingle<SiteSettings>('site-settings', 'id')
   * settings?.siteName  // typed as string | undefined (entry may be null)
   */
  getSingle<T>(schemaSlug: string, locale: KontenaLocale): Promise<KontenaEntry<T> | null>

  /**
   * List entries from a collection-type schema, with cursor pagination and
   * optional free-text search.
   *
   * Returns `{ items, pagination }`. A 404 (schema has no entries for the
   * locale) resolves to an empty list rather than throwing; any other non-2xx
   * response throws. Pass `params.q` to filter server-side, `params.cursor`
   * (from a prior page's `pagination.nextCursor`) to page forward.
   *
   * @example
   * interface Post { title: string; body: string }
   * const { items, pagination } = await kontena.listCollection<Post>('post', { locale: 'id', limit: 10 })
   * items[0]?.title
   * if (pagination.hasMore) { /* fetch pagination.nextCursor *\/ }
   */
  listCollection<T>(
    schemaSlug: string,
    params?: ListCollectionParams,
  ): Promise<{ items: Array<KontenaEntry<T>>; pagination: KontenaPagination }>

  /**
   * Resolve a single entry of a collection schema by its `slug` in the given
   * locale. Returns `null` when no entry with that slug exists.
   *
   * The public read API addresses collection entries by id, not slug, so this
   * fetches the first page (up to 100 entries) for the schema+locale and
   * matches the slug client-side. Sufficient for typical site volumes; for
   * very large collections prefer paging {@link KontenaClient.listCollection}.
   *
   * @example
   * const post = await kontena.getCollectionEntry<Post>('post', 'hello-world', 'id')
   */
  getCollectionEntry<T>(
    schemaSlug: string,
    slug: string,
    locale: KontenaLocale,
  ): Promise<KontenaEntry<T> | null>
}

interface RawRow {
  id?: string
  documentId?: string
  locale?: string
  slug?: string | null
  status?: 'draft' | 'published'
  data?: Record<string, unknown>
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
}

interface RawCollectionResponse {
  data: RawRow[]
  meta: { pagination: KontenaPagination }
}

function unwrapRow<T>(row: RawRow | null | undefined): KontenaEntry<T> | null {
  if (!row) return null
  const userData = (row.data && typeof row.data === 'object' ? row.data : {}) as Record<
    string,
    unknown
  >
  const _row: KontenaSystemColumns = {
    id: row.id,
    documentId: row.documentId,
    locale: row.locale,
    slug: row.slug,
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
  return { ...userData, _row } as KontenaEntry<T>
}

/**
 * Create a Kontena public-read API client scoped to one project.
 *
 * The returned client wraps the HTTP surface with typed methods and unwraps
 * the API's `{ id, locale, data: {...} }` row shape into a flat
 * `{ ...userFields, _row: {...systemColumns} }` consumers can read directly.
 *
 * `baseUrl` is optional and defaults to Sawala's production public API; pass it
 * only to target a non-default environment (staging, preview, local tunnel, or
 * self-hosted backend).
 *
 * @example
 * import { createKontenaClient } from '@sawala/kontena-client'
 *
 * const kontena = createKontenaClient({
 *   projectId: 'proj_acme123',
 *   publicApiKey: 'pk_live_xxx',
 * })
 *
 * interface Landing { hero: string; cta: string }
 * const landing = await kontena.getSingle<Landing>('landing', 'id')
 */
// The API key travels in the X-API-Key header on every request. Even though
// public (pk_) keys are browser-safe, a cleartext base would expose request and
// response content on the network path, so require https — http is allowed only
// for a local loopback host (local backend / tunnel dev).
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

export function createKontenaClient(opts: KontenaClientOptions): KontenaClient {
  const base = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  assertSecureBaseUrl(base)
  const headers: HeadersInit = {
    'X-API-Key': opts.publicApiKey,
    accept: 'application/json',
  }

  function url(path: string, search: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    params.set('format', 'strapi-v5')
    for (const [k, v] of Object.entries(search)) {
      if (v !== undefined && v !== '') params.set(k, v)
    }
    return `${base}/projects/${opts.projectId}${path}?${params.toString()}`
  }

  async function getJson<R>(u: string): Promise<R | null> {
    const fetchImpl = opts.fetchImpl ?? globalThis.fetch
    const res = await fetchImpl(u, { headers })
    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error(`Kontena ${res.status} ${res.statusText} for ${u}`)
    }
    return (await res.json()) as R
  }

  const client: KontenaClient = {
    async getSingle<T>(
      schemaSlug: string,
      locale: KontenaLocale,
    ): Promise<KontenaEntry<T> | null> {
      const u = url(`/content/single/${schemaSlug}`, { locale })
      const row = await getJson<RawRow>(u)
      return unwrapRow<T>(row)
    },

    async listCollection<T>(
      schemaSlug: string,
      params?: ListCollectionParams,
    ): Promise<{ items: Array<KontenaEntry<T>>; pagination: KontenaPagination }> {
      const u = url(`/content/collection/${schemaSlug}`, {
        locale: params?.locale,
        limit: params?.limit?.toString(),
        cursor: params?.cursor,
        fields: params?.fields?.join(','),
        q: params?.q,
      })
      const json = await getJson<RawCollectionResponse>(u)
      if (!json) {
        return { items: [], pagination: { limit: params?.limit ?? 25, hasMore: false } }
      }
      const items = json.data
        .map((r) => unwrapRow<T>(r))
        .filter((x): x is KontenaEntry<T> => x !== null)
      return { items, pagination: json.meta.pagination }
    },

    async getCollectionEntry<T>(
      schemaSlug: string,
      slug: string,
      locale: KontenaLocale,
    ): Promise<KontenaEntry<T> | null> {
      // The public read API addresses collection entries by id, not slug, so
      // we pull the first page (≤100) for this schema+locale and match the
      // slug client-side. Fine until per-slug routing lands upstream.
      const { items } = await client.listCollection<T>(schemaSlug, { locale, limit: 100 })
      return items.find((entry) => entry._row.slug === slug) ?? null
    },
  }

  return client
}
