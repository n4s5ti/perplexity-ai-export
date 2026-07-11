import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as {
  bin?: Record<string, string>
  main?: string
}

describe('package entrypoint', () => {
  it('exposes perplexity-history-export through a tracked executable wrapper', () => {
    const wrapper = './bin/perplexity-history-export.mjs'

    expect(packageJson.main).toBeUndefined()
    expect(packageJson.bin).toEqual({ 'perplexity-history-export': wrapper })
    expect(existsSync(resolve(packageRoot, wrapper))).toBe(true)
    expect(
      execFileSync('git', ['ls-files', '--error-unmatch', '--', wrapper], {
        cwd: packageRoot,
        encoding: 'utf8',
      }).trim()
    ).toBe('bin/perplexity-history-export.mjs')
  })
})
