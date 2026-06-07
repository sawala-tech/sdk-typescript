---
'@sawala/kontena-client': minor
---

`baseUrl` is now optional and defaults to the production public read API (`https://api.sawala.cloud/public/kontena`). Consumers on the managed platform can construct a client with just `projectId` and `publicApiKey`. The option remains overridable for non-default environments (staging, preview, local tunnel, self-hosted), so existing callers that pass `baseUrl` are unaffected.
