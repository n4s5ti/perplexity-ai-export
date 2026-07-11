import { describe, expect, it, vi, beforeEach } from 'vitest'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const mocks = vi.hoisted(() => ({
  executablePath: vi.fn(),
  existsSync: vi.fn(),
  spawnSync: vi.fn(),
}))

vi.mock('@playwright/test', () => ({
  chromium: {
    executablePath: mocks.executablePath,
  },
}))

vi.mock('node:fs', () => ({
  existsSync: mocks.existsSync,
}))

vi.mock('node:child_process', () => ({
  spawnSync: mocks.spawnSync,
}))

import { ensureChromiumInstalled } from '../../src/scraper/browser-bootstrap.js'

describe('ensureChromiumInstalled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.executablePath.mockReturnValue('/tmp/chromium')
    mocks.spawnSync.mockReturnValue({ status: 0 })
  })

  it('returns without installing when the Playwright Chromium executable already exists', () => {
    mocks.existsSync.mockReturnValue(true)

    ensureChromiumInstalled()

    expect(existsSync).toHaveBeenCalledWith('/tmp/chromium')
    expect(spawnSync).not.toHaveBeenCalled()
  })

  it('invokes the Playwright CLI with exactly install chromium when the executable is absent', () => {
    mocks.existsSync.mockReturnValue(false)

    ensureChromiumInstalled()

    const resolvedCli = fileURLToPath(import.meta.resolve('@playwright/test/cli'))
    expect(spawnSync).toHaveBeenCalledWith(process.execPath, [resolvedCli, 'install', 'chromium'], {
      stdio: 'inherit',
      env: process.env,
    })
  })

  it('surfaces a non-zero installer result', () => {
    mocks.existsSync.mockReturnValue(false)
    mocks.spawnSync.mockReturnValue({ status: 23 })

    expect(() => ensureChromiumInstalled()).toThrow(
      'Failed to install Playwright Chromium: installer exited with status 23'
    )
  })
})
