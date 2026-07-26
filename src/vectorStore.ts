import fs from "fs/promises";
import path from "path";
import { GeminiClient } from "./geminiClient.js";
import { DocumentEntry, SearchResult } from "./types.js";

interface StoredVector {
  id: string;
  text: string;
  metadata: Record<string, string>;
  embedding: number[];
}

const VECTOR_STORE_PATH = path.resolve("data/vectors.json");

export class VectorStore {
  private client: GeminiClient;
  private vectors: StoredVector[] = [];

  constructor(client: GeminiClient) {
    this.client = client;
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(VECTOR_STORE_PATH, "utf-8");
      this.vectors = JSON.parse(raw) as StoredVector[];
    } catch (error) {
      this.vectors = [];
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(VECTOR_STORE_PATH), { recursive: true });
    await fs.writeFile(VECTOR_STORE_PATH, JSON.stringify(this.vectors, null, 2), "utf-8");
  }

  async addDocument(doc: DocumentEntry): Promise<void> {
    let embedding: number[];
    try {
      embedding = await this.client.embedText(doc.text);
    } catch (err) {
      // deterministic fallback embedding when external embedding fails
      const dim = (this.vectors[0] && this.vectors[0].embedding && this.vectors[0].embedding.length) || 1536;
      embedding = this.deterministicEmbedding(doc.text, dim);
    }
    const existingIndex = this.vectors.findIndex((item) => item.id === doc.id);
    const vectorItem: StoredVector = {
      id: doc.id,
      text: doc.text,
      metadata: doc.metadata,
      embedding,
    };

    if (existingIndex >= 0) {
      this.vectors[existingIndex] = vectorItem;
    } else {
      this.vectors.push(vectorItem);
    }

    await this.save();
  }

  // deterministic, reproducible pseudo-embedding based on text hash
  private deterministicEmbedding(text: string, dim: number): number[] {
    // simple 32-bit hash
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }

    // mulberry32 PRNG
    const seed = h >>> 0;
    function mulberry32(a: number) {
      return function () {
        let t = (a += 0x6d2b79f5) >>> 0;
        t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61) >>> 0;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    const rnd = mulberry32(seed);
    const vec: number[] = new Array(dim);
    for (let i = 0; i < dim; i++) {
      // map to small values centered at 0
      vec[i] = (rnd() - 0.5) * 0.2;
    }
    return vec;
  }

  async search(query: string, topK = 4): Promise<SearchResult[]> {
    if (this.vectors.length === 0) {
      return [];
    }

    let queryEmbedding: number[];
    try {
      queryEmbedding = await this.client.embedText(query);
    } catch {
      const dim = (this.vectors[0] && this.vectors[0].embedding && this.vectors[0].embedding.length) || 1536;
      queryEmbedding = this.deterministicEmbedding(query, dim);
    }

    const scored = this.vectors.map((item) => ({
      doc: { id: item.id, text: item.text, metadata: item.metadata },
      score: this.cosineSimilarity(item.embedding, queryEmbedding),
    }));

    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
    const magA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
    const magB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
    return magA && magB ? dot / (magA * magB) : 0;
  }
}
