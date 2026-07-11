declare module '@huggingface/transformers' {
  export const AutoTokenizer: {
    from_pretrained(modelName: string): Promise<unknown>
  }
  export const AutoModelForSequenceClassification: {
    from_pretrained(modelName: string, options?: unknown): Promise<unknown>
  }
}

declare module '@vscode/ripgrep' {
  export const rgPath: string
}

declare module 'vectra' {
  export class LocalIndex {
    constructor(path: string)
    isIndexCreated(): Promise<boolean>
    createIndex(): Promise<void>
    beginUpdate(): Promise<void>
    endUpdate(): Promise<void>
    insertItem(item: unknown): Promise<void>
    queryItems(
      vector: number[],
      query: string,
      limit: number,
      filter?: (meta: Record<string, unknown>) => boolean
    ): Promise<any[]>
  }
}
