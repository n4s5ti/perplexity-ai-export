#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tsxCli = resolve(packageRoot, 'node_modules/tsx/dist/cli.mjs')
const entrypoint = resolve(packageRoot, 'src/index.ts')
const child = spawnSync(process.execPath, [tsxCli, entrypoint, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
})

if (child.error) throw child.error
if (child.status !== 0) process.exitCode = child.status ?? 1
