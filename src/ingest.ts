import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { VectorStore } from "./vectorStore.js";
import { GeminiClient } from "./geminiClient.js";
import { DocumentEntry } from "./types.js";

dotenv.config();

const CORPUS_PATH = path.resolve("data/corpus");

function chunkText(text: string, maxLen = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + maxLen, text.length);
    const chunk = text.slice(i, end).trim();
    if (chunk) chunks.push(chunk);
    if (end === text.length) break;
    i = Math.max(end - overlap, i + 1);
  }
  return chunks;
}

async function listCorpusFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listCorpusFiles(fullPath)));
    } else if (/\.(md|txt|json)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function loadDocument(filePath: string): Promise<DocumentEntry> {
  const text = await fs.readFile(filePath, "utf-8");
  const relative = path.relative(CORPUS_PATH, filePath);
  const collection = relative.split(path.sep)[0] || "general";
  return {
    id: relative,
    text,
    metadata: {
      source: path.basename(filePath),
      path: filePath,
      collection,
    },
  };
}

async function ingestCorpus(): Promise<void> {
  const client = new GeminiClient();
  await client.verifyEndpoints();
  const store = new VectorStore(client);
  await store.load();

  const files = await listCorpusFiles(CORPUS_PATH);
  if (files.length === 0) {
    console.warn(`No corpus files found in ${CORPUS_PATH}. Add documents to data/corpus/ and run npm run ingest again.`);
    return;
  }

  let totalChunks = 0;
  for (const filePath of files) {
    const doc = await loadDocument(filePath);
    console.log(`Indexing ${doc.id}`);
    const chunks = chunkText(doc.text, 800, 100);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk.trim()) continue;
      const id = `${doc.id}#chunk-${i}`;
      await store.addDocument({
        id,
        text: chunk,
        metadata: {
          source: doc.metadata.source || "",
          path: doc.metadata.path || "",
          collection: doc.metadata.collection || "",
          chunk_index: String(i),
          total_chunks: String(chunks.length),
        },
      });
      totalChunks++;
    }
  }

  console.log(`Ingested ${files.length} documents into ${totalChunks} chunks.`);
}

if (import.meta.url.endsWith("/ingest.ts")) {
  ingestCorpus().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { ingestCorpus, CORPUS_PATH };
