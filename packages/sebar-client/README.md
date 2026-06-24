# @sawala/sebar-client

Server-side TypeScript client for **Sebar**, Sawala Cloud's email send API. Send
transactional email from your backend with a few lines and typed results.

> **Server-only.** This SDK authenticates with a **secret key** (`sk_live_…`),
> which must never reach a browser. The client throws if it detects a browser
> environment. Keep the key in a server-only secret (e.g.
> `process.env.SEBAR_SECRET_KEY`) — never a `NEXT_PUBLIC_…` / client-inlined
> variable.

## Install

    npm install @sawala/sebar-client

## Usage

    import { createSebarClient } from '@sawala/sebar-client'

    const sebar = createSebarClient({ apiKey: process.env.SEBAR_SECRET_KEY! })

    const result = await sebar.emails.send({
      to: { email: 'you@example.com', name: 'You' },
      templateId: 'welcome',
      variables: { name: 'Sutisna' },
    })

    if (result.status === 'queued') {
      console.log('queued', result.id)
    } else if (result.status === 'suppressed') {
      console.log('not sent — suppressed:', result.reason)
    }

Instead of a `templateId`, you can send an inline message by providing a
`subject` plus at least one of `bodyHtml` / `bodyText`:

    await sebar.emails.send({
      to: { email: 'you@example.com' },
      subject: 'Hello',
      bodyHtml: '<p>Hi there</p>',
    })

### Next.js (Server Action / Route Handler) and Kodena

The client depends only on the Web `fetch` API, so it runs in any server
runtime — Node, a Next.js Server Action, a Route Handler, or an app deployed on
Kodena. Construct it inside server code and read the key from a server-only env
var:

    'use server'
    import { createSebarClient } from '@sawala/sebar-client'

    const sebar = createSebarClient({ apiKey: process.env.SEBAR_SECRET_KEY! })

    export async function sendWelcome(email: string) {
      return sebar.emails.send({ to: { email }, templateId: 'welcome' })
    }

If you accidentally import it into a Client Component (`'use client'`), the
browser guard throws at runtime rather than letting the secret key be bundled
into client-side code.

## Project scoping

Sawala API keys are project-scoped: a key carries the org **and** project, so a
send is always created under that key's own org/project. The SDK therefore
takes no `projectId`.

## Results & errors

`emails.send` resolves to a `SendEmailResult`:

- `{ status: 'queued', id }` — accepted and enqueued (HTTP 202).
- `{ status: 'suppressed', id, reason }` — recipient is on the org's
  suppression list, nothing was sent (HTTP 409).

Any other non-2xx response throws a `SebarApiError` with `status`, `code`
(e.g. `SECRET_KEY_REQUIRED`, `RATE_LIMITED`, `TEMPLATE_NOT_FOUND`), and an
optional `hint`.

## Options

    interface SebarClientOptions {
      apiKey: string      // secret key: 'sk_live_…'
      baseUrl?: string    // default 'https://api.sawala.cloud/public/sebar'
      fetchImpl?: typeof fetch
    }

`baseUrl` must be HTTPS (HTTP is allowed only for `localhost` during local
development).

## License

MIT
