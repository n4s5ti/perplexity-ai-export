import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

export function ensureChromiumInstalled(): void {
  if (existsSync(chromium.executablePath())) return

  const cliPath = fileURLToPath(import.meta.resolve('@playwright/test/cli'))
  const installer = spawnSync(process.execPath, [cliPath, 'install', 'chromium'], {
    stdio: 'inherit',
    env: process.env,
  })

  if (installer.error) {
    throw new Error(`Failed to install Playwright Chromium: ${installer.error.message}`)
  }

  if (installer.status !== 0) {
    const detail =
      installer.status === null
        ? `installer terminated by signal ${installer.signal ?? 'unknown'}`
        : `installer exited with status ${installer.status}`
    throw new Error(`Failed to install Playwright Chromium: ${detail}`)
  }
}
