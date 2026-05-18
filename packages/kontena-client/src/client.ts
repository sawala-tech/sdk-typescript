import type {
  KontenaClientOptions,
  KontenaEntry,
  KontenaLocale,
  KontenaSystemColumns,
} from './types'

/**
 * A typed client for Kontena's public read API.
 *
 * Created via {@link createKontenaClient}. v0.1 ships with one method
 * (`getSingle`) — additional methods (`listCollection`, `getCollectionEntry`,
 * locale-pair resolution) land in later minor releases as additive surface.
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
 * @example
 * import { createKontenaClient } from '@sawala/kontena-client'
 *
 * const kontena = createKontenaClient({
 *   baseUrl: 'https://api.sawala.cloud/public/kontena',
 *   projectId: 'proj_acme123',
 *   publicApiKey: 'pk_live_xxx',
 * })
 *
 * interface Landing { hero: string; cta: string }
 * const landing = await kontena.getSingle<Landing>('landing', 'id')
 */
export function createKontenaClient(opts: KontenaClientOptions): KontenaClient {
  const base = opts.baseUrl.replace(/\/$/, '')
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

  return {
    async getSingle<T>(
      schemaSlug: string,
      locale: KontenaLocale,
    ): Promise<KontenaEntry<T> | null> {
      const u = url(`/content/single/${schemaSlug}`, { locale })
      const row = await getJson<RawRow>(u)
      return unwrapRow<T>(row)
    },
  }
}
