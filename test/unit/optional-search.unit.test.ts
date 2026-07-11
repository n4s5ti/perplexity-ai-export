import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SearchOrchestrator } from '../../src/search/search-orchestrator.js'
import type { Config } from '../../src/utils/config.js'

function createVectorDisabledConfig(): Config {
  const storageDirectory = mkdtempSync(join(tmpdir(), 'perplexity-history-export-'))

  return {
    authStoragePath: join(storageDirectory, 'auth.json'),
    waitMode: 'dynamic',
    rateLimitMs: 500,
    parallelWorkers: 1,
    checkpointSaveInterval: 1,
    exportDir: storageDirectory,
    checkpointPath: join(storageDirectory, 'checkpoint.json'),
    vectorIndexPath: join(storageDirectory, 'vector-index'),
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.1',
    ollamaEmbedModel: 'nomic-embed-text',
    enableVectorSearch: false,
    headless: true,
    debug: false,
    exportStrategies: ['markdown'],
  }
}

describe('optional vector search', () => {
  it('rejects vectorization before loading the optional vector subsystem when disabled', async () => {
    const searchOrchestrator = new SearchOrchestrator(createVectorDisabledConfig())

    await expect(searchOrchestrator.vectorizeNow()).rejects.toThrow(
      'Vector search is disabled (ENABLE_VECTOR_SEARCH=false).'
    )
  })
})
