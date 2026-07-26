# Architect Agent

A starter project for an agentic chatbot that helps architects with knowledge, architectural file generation, and Retrieval-Augmented Generation (RAG).

## Features

- Ingests an external corpus and builds a local vector index
- Uses LLM APIs for text generation and embeddings via pluggable provider (OpenAI or Gemini)
- Includes an agentic workflow with:
  - client brief interpretation
  - concept design generation
  - space planning
  - BOQ generation
  - cost estimation
  - supplier intelligence
  - structural recommendations
  - project report generation
- Exports outputs to `output/` including Markdown, JSON, and CSV

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure your API keys:
   ```bash
   cp .env.example .env
   ```
   Then choose a provider:
   - **OpenAI**: set `OPENAI_API_KEY`
   - **Gemini**: set `GEMINI_API_KEY`

   Optional shared overrides:
   - `LLM_TEXT_MODEL`
   - `LLM_EMBEDDING_MODEL`

   Or force a provider explicitly with `LLM_PROVIDER=openai` or `LLM_PROVIDER=gemini`.

3. Add your architecture corpus under `data/corpus/`.
   - Use `data/corpus/space_data/` for site and spatial data.
   - Use `data/corpus/architectural_files/` for floor plans, layout notes, and architectural reference files.

4. Ingest the corpus:
   ```bash
   npm run ingest
   ```

5. Run the assistant to ask a question or interpret a brief:
   ```bash
   npm run dev -- brief "I need a modern 4-bedroom family home on a 50x100 ft plot with a budget of UGX 250 million."
   ```

6. Run generation to create deliverables and architectural files based on details and requirements:
   ```bash
   npm run dev -- generate "I need a modern 4-bedroom family home on a 50x100 ft plot with a budget of UGX 250 million."
   ```

## Usage examples

- `npm run dev -- brief "<client brief>"`
- `npm run dev -- concept "<client brief>"`
- `npm run dev -- space "<client brief>"`
- `npm run dev -- boq "<client brief>"`
- `npm run dev -- cost "<client brief>"`
- `npm run dev -- suppliers "<client brief>"`
- `npm run dev -- structure "<client brief>"`
- `npm run dev -- workflow "<client brief>"`
- `npm run dev -- generate "<client brief>"`

## Project layout

- `src/`
  - `index.ts` — entrypoint
  - `agent.ts` — high-level agent logic
  - `geminiClient.ts` — provider-agnostic API wrapper for OpenAI or Gemini
  - `vectorStore.ts` — simple local vector database
  - `ingest.ts` — corpus ingestion workflow
  - `tools/` — agent tools for web search and file generation

## Notes

This repository is a scaffold. You can switch between OpenAI and Gemini entirely through `.env` — no code changes required.

- `LLM_PROVIDER=auto` selects based on which API key is set
- `OPENAI_API_KEY` activates the OpenAI provider
- `GEMINI_API_KEY` activates the Gemini provider
- Optional:
  - `OPENAI_BASE_URL` for compatible APIs like Together, Groq, Ollama, etc.
  - `LLM_TEXT_MODEL` and `LLM_EMBEDDING_MODEL` to override model names
