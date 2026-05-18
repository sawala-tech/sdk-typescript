#!/usr/bin/env node
import { existsSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const script = process.argv[2]
if (!script) {
  console.error('usage: each-workspace.mjs <script>')
  process.exit(2)
}

if (!existsSync('packages')) {
  console.log(`no packages/ directory; skipping '${script}'`)
  process.exit(0)
}

const workspaces = readdirSync('packages').filter((d) =>
  existsSync(`packages/${d}/package.json`),
)
if (workspaces.length === 0) {
  console.log(`no workspaces yet; skipping '${script}'`)
  process.exit(0)
}

const result = spawnSync('npm', ['run', script, '--workspaces', '--if-present'], {
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
