/** Options for {@link createDatanaClient}. `baseUrl` defaults to Sawala's
 * production public API; only `projectId` and `publicApiKey` differ per project. */
export interface DatanaClientOptions {
  projectId: string
  /** A publishable (`pk_live_…`/`pk_test_…`) Datana API key. Browser-safe. */
  publicApiKey: string
  baseUrl?: string
  /** Override the global `fetch` (testing / non-standard runtimes). */
  fetchImpl?: typeof fetch
}

/** A field in a collection's schema (private fields are never returned publicly). */
export interface DatanaField {
  name: string
  label?: string
  type: string
  required: boolean
  options?: {
    enum?: string[]
    targetSchema?: string
    many?: boolean
    group?: string
  }
}

/** A collection's public schema (from {@link DatanaClient.getCollection}). */
export interface DatanaCollection {
  id: string
  slug: string
  name: string
  fields: DatanaField[]
  visibility: 'public' | 'private'
  pinned?: boolean
  createdAt?: string
  updatedAt?: string
}

/** A record. Public reads always return `status: 'published'`; `data` has any
 * `private` fields removed server-side. `T` is the shape of `data`. */
export interface DatanaRecord<T = Record<string, unknown>> {
  id: string
  data: T
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

/** Cursor pagination metadata. Pass `nextCursor` as `cursor` to fetch the next page. */
export interface DatanaPagination {
  limit: number
  cursor?: string
  hasMore: boolean
  nextCursor?: string | null
}

export interface ListRecordsParams {
  /** `{ field: value }` → one `field:value` filter each; or raw `"field:op:value"`
   * strings for `in:`/`gte:`/`lte:`. Array fields match by membership server-side. */
  filter?: Record<string, string | number> | string[]
  /** `'field'` (asc) or `'-field'` (desc). */
  sort?: string
  /** Case-insensitive title search. */
  q?: string
  limit?: number
  cursor?: string
}

export interface AggregateParams {
  /** Include the total published count. */
  count?: boolean
  /** Group counts by a field (single or array field). */
  groupBy?: string
  /** Field names to return distinct-value counts for. */
  distinct?: string[]
}

export interface AggregateResult {
  total?: number
  groups?: Record<string, number>
  distinct?: Record<string, number>
}

/** A typed client for Datana's public read API. Create via {@link createDatanaClient}. */
export interface DatanaClient {
  /** Fetch a public collection's schema (fields, options) — `null` if not found/public. */
  getCollection(collection: string): Promise<DatanaCollection | null>
  /** List published records of a public collection, with filter/sort/search/cursor. */
  listRecords<T = Record<string, unknown>>(
    collection: string,
    params?: ListRecordsParams,
  ): Promise<{ items: Array<DatanaRecord<T>>; pagination: DatanaPagination }>
  /** Fetch one published record by id — `null` if missing/unpublished. */
  getRecord<T = Record<string, unknown>>(collection: string, id: string): Promise<DatanaRecord<T> | null>
  /** Count / group-by / distinct over published records. */
  aggregate(collection: string, params: AggregateParams): Promise<AggregateResult>
}
