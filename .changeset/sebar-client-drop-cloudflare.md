---
"@sawala/sebar-client": patch
---

Remove the Cloudflare Workers mention from the README and package description. The client depends only on the Web `fetch` API and runs on any server runtime (Node, a Next.js Server Action / Route Handler, or an app deployed on Kodena); the docs no longer single out a specific Workers platform.
