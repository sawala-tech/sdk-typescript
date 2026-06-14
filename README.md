# `@sawala/*` SDKs for TypeScript

This is the public monorepo for [Sawala Cloud](https://sawala.co)'s TypeScript SDK family. Every `@sawala/*` package on npm is built from one of the workspaces under [`packages/`](./packages).

## Packages

| Package | npm | Description |
| --- | --- | --- |
| [`@sawala/formulir-react`](./packages/formulir-react) | [![npm](https://img.shields.io/npm/v/@sawala/formulir-react.svg)](https://www.npmjs.com/package/@sawala/formulir-react) | React components and headless hooks for embedding Sawala Formulir forms. |
| [`@sawala/kontena-client`](./packages/kontena-client) | [![npm](https://img.shields.io/npm/v/@sawala/kontena-client.svg)](https://www.npmjs.com/package/@sawala/kontena-client) | Framework-agnostic client for the Kontena public read API — Sawala's headless CMS. |
| [`@sawala/datana-client`](./packages/datana-client) | [![npm](https://img.shields.io/npm/v/@sawala/datana-client.svg)](https://www.npmjs.com/package/@sawala/datana-client) | Framework-agnostic client for the Datana public read API — Sawala's structured-data platform. |

More packages will appear here as they ship.

## Install

Pick the package you need and install it directly. Each package is independently versioned via [Changesets](https://github.com/changesets/changesets); their versions are unrelated to one another.

```bash
npm install @sawala/formulir-react
```

Each package's own README has its quickstart, API reference, and per-framework examples.

## Repo layout

```
sdk-typescript/
  packages/
    formulir-react/          # @sawala/formulir-react
    kontena-client/          # @sawala/kontena-client
    datana-client/           # @sawala/datana-client
    ...future packages
  .changeset/                # per-package independent versioning
  .github/workflows/         # shared CI + release pipeline
  tsconfig.base.json         # shared TypeScript base; each package extends this
  eslint.config.js           # shared lint config
  package.json               # workspaces: ["packages/*"]
```

This shape matches the pattern used by [`anthropic-sdk-typescript`](https://github.com/anthropics/anthropic-sdk-typescript), [`cloudflare-typescript`](https://github.com/cloudflare/cloudflare-typescript), and [AWS SDK v3](https://github.com/aws/aws-sdk-js-v3): one repo for source, many independently-versioned npm packages.

## Contributing

This repo is open for community contributions. Bugs, ideas, and PRs are welcome via the [issue tracker](https://github.com/sawala-tech/sdk-typescript/issues).

Local development:

```bash
nvm use            # picks up Node version from .nvmrc
npm ci
npm run build
npm test
```

Every PR that changes published code must include a changeset:

```bash
npx changeset
```

The interactive prompt picks the affected package(s) and the semver bump. Commit the resulting `.changeset/*.md` file with your change. On merge to `main`, the release workflow opens a "Version Packages" PR; merging that PR publishes the affected packages to npm.

## License

MIT. See [LICENSE](./LICENSE).
