---
"@sawala/kontena-client": patch
"@sawala/formulir-react": patch
---

Security: validate `baseUrl` transport. `@sawala/kontena-client` now rejects a
non-https `baseUrl` (http allowed only for localhost / loopback), since the API
key and content travel over it. `@sawala/formulir-react` logs a warning for an
insecure `baseUrl` rather than throwing, to avoid breaking the host page. Default
base URLs are unchanged (the production https gateway).
