# @sawala/sebar-client

## 0.1.1

### Patch Changes

- ecccc46: Remove the Cloudflare Workers mention from the README and package description. The client depends only on the Web `fetch` API and runs on any server runtime (Node, a Next.js Server Action / Route Handler, or an app deployed on Kodena); the docs no longer single out a specific Workers platform.

## 0.1.0

### Minor Changes

- Initial release. Server-side client for Sebar's email send API:
  `createSebarClient({ apiKey }).emails.send({ to, templateId, variables })`
  returns a typed `{ status: 'queued', id }` / `{ status: 'suppressed', id, reason }`
  result, or throws `SebarApiError` for other non-2xx responses. Authenticates
  with a secret key (`sk_live_…`), enforces an HTTPS `baseUrl`, and refuses to
  run in a browser to prevent the secret key being bundled into client code.
