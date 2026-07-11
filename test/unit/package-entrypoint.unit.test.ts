import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as {
  bin?: Record<string, string>
  version?: string
  main?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
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

  it('reports the runtime that executes the wrapper through a standard version probe', () => {
    const wrapper = resolve(packageRoot, packageJson.bin?.['perplexity-history-export'] ?? '')

    const output = execFileSync(process.execPath, [wrapper, '--version'], {
      cwd: packageRoot,
      encoding: 'utf8',
      timeout: 3000,
    }).trim()

    expect(output).toBe(
      `perplexity-history-export ${packageJson.version} (Node ${process.version})`
    )
  })

  it('ships exporter runtime dependencies without optional ML or native downloader packages', () => {
    const dependencies = packageJson.dependencies ?? {}

    expect(dependencies).toMatchObject({
      tsx: expect.any(String),
      '@playwright/test': expect.any(String),
    })
    expect(dependencies).not.toHaveProperty('@huggingface/transformers')
    expect(dependencies).not.toHaveProperty('vectra')
    expect(dependencies).not.toHaveProperty('@vscode/ripgrep')
  })

  it('does not install optional ML or native downloader packages when npm builds a Git package', () => {
    const devDependencies = packageJson.devDependencies ?? {}

    expect(devDependencies).not.toHaveProperty('@huggingface/transformers')
    expect(devDependencies).not.toHaveProperty('vectra')
    expect(devDependencies).not.toHaveProperty('@vscode/ripgrep')
  })

  it('does not run a Git-install prepare lifecycle that would install optional dev dependencies', () => {
    const scripts = packageJson.scripts ?? {}

    expect(scripts).not.toHaveProperty('prepare')
  })
})
