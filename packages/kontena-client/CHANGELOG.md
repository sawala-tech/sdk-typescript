# @sawala/kontena-client

## 0.2.0

### Minor Changes

- ad4b6c6: Add collection read methods: `listCollection<T>(schemaSlug, params?)` (cursor pagination, `fields` projection, and `q` free-text search) and `getCollectionEntry<T>(schemaSlug, slug, locale)` (resolve a single entry by slug). Adds `KontenaPagination` and `ListCollectionParams` to the public types. Additive only — `getSingle` and all existing exports are unchanged, so `^0.1.0` consumers pick this up automatically.

  This grows the client beyond single-type reads so collection-driven sites (e.g. the Kodena Blog Instant Page template — paginated post lists, post-by-slug routes, server-side search) can use the published package instead of vendoring their own client.

## 0.1.0

### Minor Changes

- a082cb9: Initial public release. TypeScript client for the [Kontena](https://sawala.co) public read API — Sawala Cloud's headless CMS. Framework-agnostic; runs in Node 18+, browsers, and Cloudflare Workers.

  v0.1.0 ships a minimal surface intentionally — one method (`getSingle<T>(schemaSlug, locale)`) plus the supporting types (`KontenaEntry<T>`, `KontenaSystemColumns`, `KontenaClientOptions`, `KontenaLocale`, `KontenaLocaleHint<L>`). Additional methods (`listCollection` with pagination, `getCollectionEntry` by slug, locale-pair resolution) will land as additive minor bumps in 0.2.0+ once their API shapes bake against real consumer needs.

  ```ts
  import { createKontenaClient } from '@sawala/kontena-client'

  const kontena = createKontenaClient({
    baseUrl: 'https://api.sawala.cloud/public/kontena',
    projectId: 'proj_acme123',
    publicApiKey: 'pk_live_xxx',
  })

  interface Landing {
    hero: string
    cta: string
  }
  const landing = await kontena.getSingle<Landing>('landing', 'id')
  ```

  Published via npm Trusted Publishing (OIDC) with SLSA Level 3 provenance attestation.
