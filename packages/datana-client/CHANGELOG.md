# @sawala/datana-client

## 0.2.0

### Minor Changes

- f026e0a: Initial release: a typed public-read client for the Datana API (Sawala Cloud's structured-data platform). Framework-agnostic (Node, browsers, Cloudflare Workers), authenticated with a publishable `pk_` key. Methods: `getCollection` (schema, private fields stripped), `listRecords` (filter/search/sort/cursor pagination, array-field membership filters), `getRecord`, and `aggregate` (count / groupBy / distinct).
