# `@sawala/datana-client`

TypeScript client for the public read API of [Datana](https://sawala.co) — Sawala Cloud's structured-data platform. Framework-agnostic; runs in Node, browsers, and Cloudflare Workers.

## Install

```bash
npm install @sawala/datana-client
```

Requires Node 18+ (for the built-in `fetch`).

## Quickstart

```ts
import { createDatanaClient } from '@sawala/datana-client'

const datana = createDatanaClient({
  projectId: 'proj_acme123',
  publicApiKey: 'pk_live_xxx', // a publishable key from your Datana project's API keys
})

interface Startup {
  title: string
  slug: string
  city: string
  industry_sector: string[]
}

const { items, pagination } = await datana.listRecords<Startup>('startup', { limit: 20 })
console.log(items[0]?.data.title, pagination.hasMore)
```

Only **published** records of **public** collections are returned, and any fields a collection marks **private** are stripped server-side — this client cannot see them.

## API

### `getCollection(slug)`

Fetch a collection's schema (its fields, types, and `select`/`relation` options) — useful for building filter dropdowns or generating types. Private fields are not included. Returns `null` if the collection is missing or not public.

```ts
const col = await datana.getCollection('startup')
col?.fields.forEach((f) => console.log(f.name, f.type, f.options?.enum))
```

### `listRecords<T>(slug, params?)`

List published records with server-side filtering, search, sorting, and cursor pagination.

```ts
const { items, pagination } = await datana.listRecords<Startup>('startup', {
  filter: { industry_sector: 'fintech', city: 'palembang' }, // array fields match by membership
  q: 'bot',          // case-insensitive title search
  sort: '-createdAt',
  limit: 25,
})
```

`filter` accepts an object (`{ field: value }` → one `field:value` each) or raw strings for advanced ops:

```ts
await datana.listRecords('startup', { filter: ['total_employees:gte:10', 'industry_sector:in:fintech,edu'] })
```

Page through everything with the cursor:

```ts
let cursor: string | undefined
do {
  const page = await datana.listRecords<Startup>('startup', { limit: 100, cursor })
  for (const r of page.items) handle(r)
  cursor = page.pagination.nextCursor ?? undefined
} while (cursor)
```

### `getRecord<T>(slug, id)`

Fetch one published record by id; `null` if missing or not published.

```ts
const startup = await datana.getRecord<Startup>('startup', '01J…')
```

### `aggregate(slug, params)`

Counts over published records — for stat cards, region/sector/SDG breakdowns, and facet counts. Works on single and array fields.

```ts
await datana.aggregate('startup', { count: true })                 // { total: 501 }
await datana.aggregate('startup', { groupBy: 'province' })         // { groups: { 'dki-jakarta': 119, … } }
await datana.aggregate('startup', { groupBy: 'industry_sector' })  // array field, unnested
await datana.aggregate('startup', { distinct: ['city', 'industry_sector'] })
```

## Options

| Option | Required | Description |
|--------|----------|-------------|
| `projectId` | yes | Your Datana project id (`proj_…`). |
| `publicApiKey` | yes | A **publishable** key (`pk_live_…`/`pk_test_…`). Browser-safe; never use a secret (`sk_…`) key in client code. |
| `baseUrl` | no | Defaults to `https://api.sawala.cloud/public/datana`. |
| `fetchImpl` | no | Override the global `fetch`. |

## Scope

This is a **public read** client. Creating, updating, or publishing records is done through the authenticated dashboard / CLI, not this SDK.

## License

MIT
