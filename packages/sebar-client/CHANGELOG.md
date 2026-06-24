# @sawala/sebar-client

## 0.1.0

### Minor Changes

- Initial release. Server-side client for Sebar's email send API:
  `createSebarClient({ apiKey }).emails.send({ to, templateId, variables })`
  returns a typed `{ status: 'queued', id }` / `{ status: 'suppressed', id, reason }`
  result, or throws `SebarApiError` for other non-2xx responses. Authenticates
  with a secret key (`sk_live_…`), enforces an HTTPS `baseUrl`, and refuses to
  run in a browser to prevent the secret key being bundled into client code.
