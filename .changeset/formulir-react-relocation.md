---
'@sawala/formulir-react': patch
---

Relocate `@sawala/formulir-react` to the `sawala-tech/sdk-typescript` monorepo. No code or API changes — the published bundle is functionally identical to 0.4.0.

The `package.json`'s `repository` field now points at the public source at https://github.com/sawala-tech/sdk-typescript/tree/main/packages/formulir-react, and the issue tracker at https://github.com/sawala-tech/sdk-typescript/issues is open for community bug reports and PRs.

Releases from this version onward ship via npm Trusted Publishing (OIDC), with provenance attestations attached automatically.
