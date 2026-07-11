#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const isVersionProbe = args.length === 1 && (args[0] === '--version' || args[0] === '-V')

if (isVersionProbe) {
  const { version } = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'))
  console.log(`perplexity-history-export ${version} (Node ${process.version})`)
} else {
  const tsxCli = resolve(packageRoot, 'node_modules/tsx/dist/cli.mjs')
  const entrypoint = resolve(packageRoot, 'src/index.ts')
  const child = spawnSync(process.execPath, [tsxCli, entrypoint, ...args], {
    stdio: 'inherit',
    env: process.env,
  })

  if (child.error) throw child.error
  if (child.status !== 0) process.exitCode = child.status ?? 1
}
