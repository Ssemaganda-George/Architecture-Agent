import { VectorStore } from "../vectorStore.js";
import { WebSearchTool } from "./webSearch.js";
import { DocumentEntry, SearchResult } from "../types.js";

export class KnowledgeRetriever {
  private store: VectorStore;
  private searchTool: WebSearchTool;

  constructor(store: VectorStore) {
    this.store = store;
    this.searchTool = new WebSearchTool();
  }

  async initialize(): Promise<void> {
    await this.store.load();
  }

  async retrieveCorpusContext(query: string, topK = 5): Promise<string> {
    const results = await this.store.search(query, topK);
    const docs = results.map((item) => item.doc);
    if (docs.length === 0) {
      return "";
    }
    return this.formatDocuments(docs);
  }

  async retrieveExternalContext(query: string): Promise<string> {
    return this.searchTool.search(query);
  }

  private formatDocuments(docs: DocumentEntry[]): string {
    return docs
      .map((doc, index) => {
        const source = doc.metadata.source ?? doc.id;
        const section = doc.metadata.collection ? `${doc.metadata.collection.toUpperCase()} REFERENCE` : "REFERENCE";
        return `==== ${section} ${index + 1}: ${source}\n${doc.text}`;
      })
      .join("\n\n");
  }
}
