# `@sawala/kontena-client`

TypeScript client for the public read API of [Kontena](https://sawala.co) — Sawala Cloud's headless CMS. Framework-agnostic; runs in Node, browsers, and Cloudflare Workers.

## Install

```bash
npm install @sawala/kontena-client
```

Requires Node 18+ (for the built-in `fetch`).

## Quickstart

```ts
import { createKontenaClient } from '@sawala/kontena-client'

const kontena = createKontenaClient({
  baseUrl: 'https://api.sawala.cloud/public/kontena',
  projectId: 'proj_acme123',
  publicApiKey: 'pk_live_xxx', // get this from your Kontena project's API keys page
})

interface Landing {
  hero: string
  cta: string
}

const landing = await kontena.getSingle<Landing>('landing', 'id')
console.log(landing?.hero)
```

The publishable API key (`pk_live_…` / `pk_test_…`) is **read-only** and **safe to embed in browser bundles** — it cannot write content, and it's rate-limited at the Kontena backend per project.

## API

### `createKontenaClient(opts)`

| Option | Type | Description |
| --- | --- | --- |
| `baseUrl` | `string` | Base URL of the Kontena public API. |
| `projectId` | `string` | The Kontena project ID this client is scoped to. |
| `publicApiKey` | `string` | Publishable read-only API key (`pk_live_…` or `pk_test_…`). |
| `fetchImpl` | `typeof fetch` (optional) | Custom fetch (defaults to global `fetch`). |

### `client.getSingle<T>(schemaSlug, locale)`

Fetches the single entry for a single-type schema in the given locale. Returns the entry as `T & { _row: KontenaSystemColumns }` — your user fields at the top level, system columns (id, slug, locale, status, timestamps) under `_row`. Returns `null` when the schema has no entry for that locale (404 from the backend); throws for any other non-2xx response.

### `client.listCollection<T>(schemaSlug, params?)`

Lists entries from a collection-type schema. Returns `{ items, pagination }` where `items` is `Array<T & { _row }>` and `pagination` is `{ limit, cursor?, hasMore, nextCursor? }`. A 404 (no entries for the locale) resolves to an empty list rather than throwing; any other non-2xx throws.

`params` (all optional): `locale`, `limit`, `cursor` (opaque, from a prior page's `pagination.nextCursor`), `fields` (string[] — restricts returned fields), `q` (free-text search, filtered server-side).

```ts
interface Post { title: string; body: string }
const { items, pagination } = await kontena.listCollection<Post>('post', { locale: 'id', limit: 10 })
if (pagination.hasMore) {
  const next = await kontena.listCollection<Post>('post', { limit: 10, cursor: pagination.nextCursor! })
}
// search:
const hits = await kontena.listCollection<Post>('post', { locale: 'id', q: 'hello', limit: 20 })
```

### `client.getCollectionEntry<T>(schemaSlug, slug, locale)`

Resolves one collection entry by its `slug` in the given locale, or `null` if none matches. The public read API addresses entries by id, so this fetches the first page (≤100 entries) and matches the slug client-side — sufficient for typical site volumes; for very large collections, page `listCollection` instead.

```ts
const post = await kontena.getCollectionEntry<Post>('post', 'hello-world', 'id')
```

## Typing your locales

`KontenaLocale` is `string` by default — any locale code your project uses works without ceremony. For autocomplete on a known fixed set, use `KontenaLocaleHint`:

```ts
import type { KontenaLocaleHint } from '@sawala/kontena-client'

type MyLocale = KontenaLocaleHint<'id' | 'en' | 'jv'>
const locale: MyLocale = 'id' // autocompletes from your union; also accepts any string
```

## What this package is NOT

- **Not an admin / authoring SDK.** This is read-only. Writing content, posting schemas, minting keys, etc. is handled by the dashboard or a future `@sawala/kontena-admin` package — not here.
- **Not a framework adapter.** v0.1 ships an isomorphic core. No React / Next.js / SvelteKit wrappers (yet). Use the core from any framework.

## Versioning

`0.x` releases may add new methods (`listCollection`, `getCollectionEntry`, etc.) as additive minor bumps. Breaking changes will go in `1.0`+ with a migration guide. Consumers on `^0.1.0` automatically pick up additive minors.

## Source and contributions

Source: <https://github.com/sawala-tech/sdk-typescript/tree/main/packages/kontena-client>

Bug reports and PRs: <https://github.com/sawala-tech/sdk-typescript/issues>

## License

MIT
