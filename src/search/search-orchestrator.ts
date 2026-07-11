import { logger } from '../utils/logger.js'
import { type Config } from '../utils/config.js'
import chalk from 'chalk'

export type SearchMode = 'rg' | 'vector' | 'auto' | 'rag'

export interface RgSearchOptions {
  pattern: string
  caseSensitive?: boolean
  wholeWord?: boolean
  regex?: boolean
}

interface VectorSearchResult {
  meta: Record<string, string>
  score: number
}

interface VectorStore {
  validate(): Promise<void>
  rebuildFromExports(): Promise<void>
  search(query: string, limit?: number): Promise<VectorSearchResult[]>
}

interface RgSearch {
  search(options: RgSearchOptions): Promise<void>
}

interface RagOrchestrator {
  answerQuestion(question: string): Promise<void>
}

export class SearchOrchestrator {
  static readonly SearchOrchestratorError = class extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'SearchOrchestratorError'
    }
  }

  static readonly ValidationError = class extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'SearchOrchestratorValidationError'
    }
  }

  private vectorStorePromise?: Promise<VectorStore>
  private rgSearchPromise?: Promise<RgSearch>
  private ragOrchestratorPromise?: Promise<RagOrchestrator>

  constructor(private readonly config: Config) {}

  async validateVectorSearch(): Promise<void> {
    this.ensureVectorSearchIsEnabled()
    await (await this.getVectorStore()).validate()
  }

  async vectorizeNow(): Promise<void> {
    this.ensureVectorSearchIsEnabled()
    await (await this.getVectorStore()).rebuildFromExports()
  }

  async search(query: string, mode: SearchMode, rgOptions: RgSearchOptions): Promise<void> {
    try {
      switch (mode) {
        case 'rg':
          await (await this.getRgSearch()).search(rgOptions)
          break
        case 'vector':
          this.ensureVectorSearchIsEnabled()
          await this.performVectorOnlySearch(query)
          break
        case 'rag':
          this.ensureVectorSearchIsEnabled()
          await (await this.getRagOrchestrator()).answerQuestion(query)
          break
        case 'auto':
        default:
          await this.executeAutoSearch(query, rgOptions)
          break
      }
    } catch (_error) {
      if (_error instanceof Error) {
        const searchFailedErrorMessage = `Search failed: ${_error.message}`
        throw new SearchOrchestrator.SearchOrchestratorError(searchFailedErrorMessage)
      }
      throw _error
    }
  }

  private async executeAutoSearch(query: string, rgOptions: RgSearchOptions): Promise<void> {
    const LONG_QUERY_WORD_COUNT_THRESHOLD = 5
    const queryWordCount = query.trim().split(/\s+/).length
    const isLongQuery = queryWordCount > LONG_QUERY_WORD_COUNT_THRESHOLD

    if (isLongQuery) {
      this.ensureVectorSearchIsEnabled()
      await this.performVectorOnlySearch(query)
    } else {
      await (await this.getRgSearch()).search(rgOptions)
    }
  }

  private async performVectorOnlySearch(query: string): Promise<void> {
    logger.info('Using vector search (Ollama + Vectra)...')
    const SEARCH_RESULT_LIMIT = 10
    const searchResults = await (await this.getVectorStore()).search(query, SEARCH_RESULT_LIMIT)

    if (searchResults.length === 0) {
      logger.info('No vector search results found.')
      return
    }

    for (const result of searchResults) {
      const { meta, score } = result
      const relevanceScoreLabel = score.toFixed(3)

      const spaceNameDisplay = chalk.green(meta['spaceName'])
      const arrowSeparator = chalk.gray('›')
      const titleDisplay = chalk.cyan(meta['title'])
      const scoreDisplay = chalk.gray(`(${relevanceScoreLabel})`)
      const pathDisplay = chalk.gray(meta['path'])

      logger.info(
        `${spaceNameDisplay} ${arrowSeparator} ${titleDisplay} ${scoreDisplay}\n${pathDisplay}\n`
      )
    }
  }

  private ensureVectorSearchIsEnabled(): void {
    if (!this.config.enableVectorSearch) {
      throw new SearchOrchestrator.ValidationError(
        'Vector search is disabled (ENABLE_VECTOR_SEARCH=false).'
      )
    }
  }

  private getVectorStore(): Promise<VectorStore> {
    this.vectorStorePromise ??= import('./vector-store.js')
      .then(({ VectorStore }) => new VectorStore(this.config))
      .catch((error: unknown) => {
        throw this.createOptionalDependencyError('Vector search', 'vectra', error)
      })
    return this.vectorStorePromise
  }

  private getRgSearch(): Promise<RgSearch> {
    this.rgSearchPromise ??= import('./rg-search.js')
      .then(({ RgSearch }) => new RgSearch(this.config))
      .catch((error: unknown) => {
        throw this.createOptionalDependencyError('Exact text search', '@vscode/ripgrep', error)
      })
    return this.rgSearchPromise
  }

  private getRagOrchestrator(): Promise<RagOrchestrator> {
    this.ragOrchestratorPromise ??= import('../ai/rag-orchestrator.js')
      .then(({ RagOrchestrator }) => new RagOrchestrator(this.config))
      .catch((error: unknown) => {
        throw this.createOptionalDependencyError(
          'RAG search',
          'the semantic search dependencies',
          error
        )
      })
    return this.ragOrchestratorPromise
  }

  private createOptionalDependencyError(
    feature: string,
    dependency: string,
    error: unknown
  ): Error {
    const detail = error instanceof Error ? ` (${error.message})` : ''
    return new SearchOrchestrator.SearchOrchestratorError(
      `${feature} is unavailable because optional dependency ${dependency} is not installed.${detail}`
    )
  }
}
