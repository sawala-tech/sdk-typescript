/**
 * Locale identifier used by a Kontena project. Kontena does not constrain
 * locale strings — they can be any value your project's editors use
 * (`'id'`, `'en'`, `'jv'`, `'fr-CA'`, etc.). For projects with a known
 * fixed set of locales, use {@link KontenaLocaleHint} for autocomplete.
 */
export type KontenaLocale = string

/**
 * Provides autocomplete hints for projects with a known fixed set of
 * locales while still accepting any string. Pass your locale union as the
 * type parameter.
 *
 * @example
 * type MyLocale = KontenaLocaleHint<'id' | 'en' | 'jv'>
 * const locale: MyLocale = 'id'  // autocompletes from your union
 */
export type KontenaLocaleHint<L extends string = 'id' | 'en'> = L | (string & {})

/**
 * System columns Kontena attaches to every content entry. Available on
 * `entry._row` after the client unwraps the raw API response.
 *
 * Every property is optional and may be `undefined` — the Kontena backend
 * omits fields that aren't set (e.g. `slug` is null for single-type entries,
 * `publishedAt` is absent for drafts).
 */
export interface KontenaSystemColumns {
  id?: string | undefined
  documentId?: string | undefined
  locale?: string | undefined
  slug?: string | null | undefined
  status?: 'draft' | 'published' | undefined
  publishedAt?: string | undefined
  createdAt?: string | undefined
  updatedAt?: string | undefined
}

/**
 * A content entry returned by the Kontena public read API, flattened for
 * client convenience. Your schema's user-defined fields appear at the top
 * level, typed by the generic parameter `T`. System columns (id, slug,
 * locale, publication state, timestamps) live under `_row`.
 *
 * @example
 * interface BlogPost { title: string; body: string }
 * const entry = await kontena.getSingle<BlogPost>('post', 'id')
 * entry?.title           // typed as string
 * entry?._row.publishedAt  // typed as string | undefined
 */
export type KontenaEntry<T> = T & { _row: KontenaSystemColumns }

/**
 * Cursor-based pagination metadata returned alongside a collection list.
 * Kontena pages collections with an opaque cursor rather than offset/limit
 * page numbers, so `nextCursor` is the only way to fetch the following page.
 *
 * @example
 * const { items, pagination } = await kontena.listCollection<Post>('post', { limit: 10 })
 * if (pagination.hasMore) {
 *   const next = await kontena.listCollection<Post>('post', { limit: 10, cursor: pagination.nextCursor! })
 * }
 */
export interface KontenaPagination {
  /** The `limit` that was applied to this page. */
  limit: number
  /** The cursor that produced this page, if any (echoed back). */
  cursor?: string
  /** Whether a further page exists after this one. */
  hasMore: boolean
  /** Opaque cursor to pass as `cursor` to fetch the next page; `null`/absent when `hasMore` is false. */
  nextCursor?: string | null
}

/**
 * Parameters for {@link KontenaClient.listCollection}. All optional.
 */
export interface ListCollectionParams {
  /** Locale to read (e.g. `'id'`). Omit to use the project default. */
  locale?: KontenaLocale
  /** Maximum rows to return for this page. */
  limit?: number
  /** Opaque pagination cursor from a prior page's {@link KontenaPagination.nextCursor}. */
  cursor?: string
  /** Restrict the returned `data` to these field names (sent as a CSV `fields` param). */
  fields?: string[]
  /** Free-text query — Kontena filters the collection server-side by this term. */
  q?: string
}

/**
 * Options for {@link createKontenaClient}.
 */
export interface KontenaClientOptions {
  /**
   * Base URL of the Kontena public API. Optional — defaults to Sawala's
   * production public API (`https://api.sawala.cloud/public/kontena`). Set this
   * only to target a non-default environment (staging, preview, a local tunnel,
   * or a self-hosted backend).
   *
   * @example
   * 'https://api.sawala.cloud/public/kontena'
   */
  baseUrl?: string

  /**
   * The Kontena project ID this client is scoped to.
   *
   * @example
   * 'proj_acme123'
   */
  projectId: string

  /**
   * Publishable read-only API key (`pk_live_…` or `pk_test_…`). Per-project,
   * read-only, safe to embed in browser bundles. Sent as the `X-API-Key`
   * header on every request.
   */
  publicApiKey: string

  /**
   * Optional fetch implementation. Defaults to the global `fetch`. Pass a
   * custom implementation when running in environments without a global
   * fetch, or when wrapping `fetch` for caching / instrumentation.
   */
  fetchImpl?: typeof fetch
}
