import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
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

  it('finds tsx when npm hoists it beside the installed Git package', () => {
    const fakeInstallRoot = mkdtempSync(join(tmpdir(), 'perplexity-history-export-hoisted-'))
    const fakeNodeModules = join(fakeInstallRoot, 'node_modules')
    const fakePackageRoot = join(fakeNodeModules, 'perplexity-history-export')
    const fakeWrapper = join(fakePackageRoot, 'bin/perplexity-history-export.mjs')

    try {
      mkdirSync(dirname(fakeWrapper), { recursive: true })
      cpSync(resolve(packageRoot, 'bin/perplexity-history-export.mjs'), fakeWrapper)
      symlinkSync(resolve(packageRoot, 'src'), join(fakePackageRoot, 'src'), 'dir')
      symlinkSync(resolve(packageRoot, 'node_modules/tsx'), join(fakeNodeModules, 'tsx'), 'dir')

      const output = execFileSync(process.execPath, [fakeWrapper], {
        cwd: fakeInstallRoot,
        encoding: 'utf8',
        env: { ...process.env, ENABLE_VECTOR_SEARCH: 'false' },
        input: '\u0003',
        timeout: 3000,
      })

      expect(output).toContain('Perplexity History Export Tool')
    } finally {
      rmSync(fakeInstallRoot, { force: true, recursive: true })
    }
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
