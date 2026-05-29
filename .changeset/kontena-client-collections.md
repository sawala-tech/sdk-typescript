---
'@sawala/kontena-client': minor
---

Add collection read methods: `listCollection<T>(schemaSlug, params?)` (cursor pagination, `fields` projection, and `q` free-text search) and `getCollectionEntry<T>(schemaSlug, slug, locale)` (resolve a single entry by slug). Adds `KontenaPagination` and `ListCollectionParams` to the public types. Additive only — `getSingle` and all existing exports are unchanged, so `^0.1.0` consumers pick this up automatically.

This grows the client beyond single-type reads so collection-driven sites (e.g. the Kodena Blog Instant Page template — paginated post lists, post-by-slug routes, server-side search) can use the published package instead of vendoring their own client.
