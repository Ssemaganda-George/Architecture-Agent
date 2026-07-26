import { GenerationResponse } from "./types.js";

type Provider = "gemini" | "openai" | "groq" | "openrouter";

export class GeminiClient {
  private provider: Provider;
  private apiKey: string;
  private textModel: string;
  private embeddingModel: string;
  private generationUrl: string;
  private embeddingUrl: string;

  constructor() {
    this.provider = this.detectProvider();
    this.apiKey = this.detectApiKey();
    this.textModel = this.detectModel("LLM_TEXT_MODEL", "GEMINI_TEXT_MODEL", "GROQ_TEXT_MODEL", "OPENROUTER_TEXT_MODEL", "gemini-2.5-flash", "gpt-4o-mini", "llama-3.3-70b-versatile", "google/gemma-3-27b-it");
    this.embeddingModel = this.detectModel("LLM_EMBEDDING_MODEL", "GEMINI_EMBEDDING_MODEL", "GROQ_EMBEDDING_MODEL", "OPENROUTER_EMBEDDING_MODEL", "gemini-embedding-001", "text-embedding-3-small", "text-embedding-3-small", "text-embedding-3-small");
    this.generationUrl = this.cleanUrl(this.detectGenerationUrl());
    this.embeddingUrl = this.cleanUrl(this.detectEmbeddingUrl());
  }

  private detectProvider(): Provider {
    const explicit = process.env.LLM_PROVIDER;
    if (explicit === "openai") return "openai";
    if (explicit === "gemini") return "gemini";
    if (explicit === "groq") return "groq";
    if (explicit === "openrouter") return "openrouter";

    const hasOpenAI = !!(process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL);
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

    const configured = [hasOpenAI, hasGemini, hasGroq, hasOpenRouter].filter(Boolean).length;
    if (configured > 1) {
      if (hasOpenRouter) return "openrouter";
      if (hasOpenAI) return "openai";
      if (hasGroq) return "groq";
      return "gemini";
    }

    if (hasOpenAI) return "openai";
    if (hasGemini) return "gemini";
    if (hasGroq) return "groq";
    if (hasOpenRouter) return "openrouter";

    throw new Error(
      "No LLM provider configured. Set OPENAI_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY in your environment."
    );
  }

  private detectApiKey(): string {
    if (this.provider === "openai") {
      const key = process.env.OPENAI_API_KEY ?? "";
      if (!key) throw new Error("OPENAI_API_KEY is required for OpenAI provider.");
      return key;
    }
    if (this.provider === "groq") {
      const key = process.env.GROQ_API_KEY ?? "";
      if (!key) throw new Error("GROQ_API_KEY is required for Groq provider.");
      return key;
    }
    if (this.provider === "openrouter") {
      const key = process.env.OPENROUTER_API_KEY ?? "";
      if (!key) throw new Error("OPENROUTER_API_KEY is required for OpenRouter provider.");
      return key;
    }
    const key = process.env.GEMINI_API_KEY ?? "";
    if (!key) throw new Error("GEMINI_API_KEY is required for Gemini provider.");
    return key;
  }

  private detectModel(sharedEnv: string, geminiEnv: string, groqEnv: string, openRouterEnv: string, geminiFallback: string, openaiFallback: string, groqFallback: string, openRouterFallback: string): string {
    const shared = process.env[sharedEnv];
    if (shared) return shared;
    if (this.provider === "openai") {
      return process.env[`OPENAI_${sharedEnv}`] ?? openaiFallback;
    }
    if (this.provider === "groq") {
      return process.env[groqEnv] ?? process.env.GROQ_TEXT_MODEL ?? groqFallback;
    }
    if (this.provider === "openrouter") {
      return process.env[openRouterEnv] ?? process.env.OPENROUTER_TEXT_MODEL ?? openRouterFallback;
    }
    return process.env[geminiEnv] ?? process.env.GEMINI_MODEL ?? geminiFallback;
  }

  private detectGenerationUrl(): string {
    if (this.provider === "openai" || this.provider === "openrouter") {
      const explicit = process.env.OPENAI_GENERATION_URL || process.env.OPENROUTER_GENERATION_URL;
      if (explicit) return explicit;
      const base = process.env.OPENAI_BASE_URL ?? process.env.OPENROUTER_BASE_URL ?? "https://api.openai.com/v1";
      return `${base.replace(/\/$/, "")}/chat/completions`;
    }
    if (this.provider === "groq") {
      const explicit = process.env.GROQ_GENERATION_URL;
      if (explicit) return explicit;
      const base = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
      return `${base.replace(/\/$/, "")}/chat/completions`;
    }
    const url = process.env.GENERATION_API_URL;
    if (!url) throw new Error("GENERATION_API_URL is required for Gemini provider.");
    return url;
  }

  private detectEmbeddingUrl(): string {
    if (this.provider === "openai" || this.provider === "openrouter") {
      const explicit = process.env.OPENAI_EMBEDDING_URL || process.env.OPENROUTER_EMBEDDING_URL;
      if (explicit) return explicit;
      const base = process.env.OPENAI_BASE_URL ?? process.env.OPENROUTER_BASE_URL ?? "https://api.openai.com/v1";
      return `${base.replace(/\/$/, "")}/embeddings`;
    }
    if (this.provider === "groq") {
      const explicit = process.env.GROQ_EMBEDDING_URL;
      if (explicit) return explicit;
      const base = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
      return `${base.replace(/\/$/, "")}/embeddings`;
    }
    const url = process.env.EMBEDDING_API_URL;
    if (!url) throw new Error("EMBEDDING_API_URL is required for Gemini provider.");
    return url;
  }

  private cleanUrl(rawUrl: string): string {
    try {
      const url = new URL(rawUrl);
      url.hostname = url.hostname.replace(/\.$/, "");
      return url.toString();
    } catch {
      return rawUrl;
    }
  }

  private withAuth(url: string): string {
    if (this.provider === "gemini") {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}key=${this.apiKey}`;
    }
    return url;
  }

  private authHeaders(): Record<string, string> {
    if (this.provider === "openai" || this.provider === "groq" || this.provider === "openrouter") {
      return { Authorization: `Bearer ${this.apiKey}` };
    }
    return {};
  }

  async verifyEndpoints(): Promise<void> {
    await this.checkEndpoint(this.generationUrl, this.buildGenerationBody("Test endpoint validation.", 1), "generation");
    try {
      await this.checkEndpoint(this.embeddingUrl, this.buildEmbeddingBody("test"), "embedding");
    } catch (err) {
      console.warn("Embedding endpoint check failed:", err instanceof Error ? err.message : err);
      console.warn("Proceeding without live embeddings; vector store will use deterministic fallback if needed.");
    }
  }

  private async checkEndpoint(url: string, body: any, use: string): Promise<void> {
    try {
      const response = await this.requestWithRetry(url, body);

      if (response.status === 404) {
        throw new Error(`The ${use} endpoint returned 404 Not Found. Verify ${url} and model setup in your environment.`);
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error(`The ${use} endpoint is reachable but authentication failed. Check your API key and permissions.`);
      }
      if (response.status >= 500) {
        throw new Error(`The ${use} endpoint returned server error ${response.status}.`);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to verify the ${use} endpoint: ${error.message}`);
      }
      throw error;
    }
  }

  async generateText(prompt: string, maxTokens = 800): Promise<GenerationResponse> {
    const body = this.buildGenerationBody(prompt, maxTokens);
    const response = await this.requestWithRetry(this.generationUrl, body);

    const result = await response.json();
    const text = this.sanitizeLLMOutput(this.extractGenerationText(result));
    return { text };
  }

  private sanitizeLLMOutput(text: string): string {
    if (!text) return text;
    return text
      .replace(/<environment_details[^>]*>[\s\S]*?<\/environment_details>\s*/g, "")
      .replace(/<environment_details[^>]*>[\s\S]*/g, "")
      .trim();
  }

  async embedText(input: string): Promise<number[]> {
    const body = this.buildEmbeddingBody(input);
    const response = await this.requestWithRetry(this.embeddingUrl, body);

    const result = await response.json();
    const embedding = this.extractEmbedding(result);
    if (!Array.isArray(embedding)) {
      throw new Error("Embedding response did not return an array.");
    }
    return embedding;
  }

  private buildGenerationBody(prompt: string, maxTokens: number): any {
    if (this.provider === "openai" || this.provider === "groq" || this.provider === "openrouter") {
      return {
        model: this.textModel,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.2,
      };
    }
    return {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
    };
  }

  private extractGenerationText(result: any): string {
    if (this.provider === "openai" || this.provider === "groq" || this.provider === "openrouter") {
      return result?.choices?.[0]?.message?.content ?? result?.output?.text ?? "";
    }
    return result?.candidates?.[0]?.content?.parts?.[0]?.text ?? result?.output?.text ?? "";
  }

  private buildEmbeddingBody(input: string): any {
    if (this.provider === "openai" || this.provider === "groq" || this.provider === "openrouter") {
      return { model: this.embeddingModel, input };
    }
    return { content: { parts: [{ text: input }] } };
  }

  private extractEmbedding(result: any): number[] {
    if (this.provider === "openai" || this.provider === "groq" || this.provider === "openrouter") {
      return result?.data?.[0]?.embedding ?? result?.embeddings?.[0]?.embedding;
    }
    return result?.embedding?.values ?? result?.data?.[0]?.embedding ?? result?.embeddings?.[0]?.embedding;
  }

  private async requestWithRetry(url: string, body: any, attempt = 1): Promise<Response> {
    const maxAttempts = 5;
    const baseDelayMs = 1000;

    const response = await fetch(this.withAuth(url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.authHeaders(),
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return response;
    }

    const isRetryable = response.status === 429 || response.status === 503;
    if (!isRetryable || attempt >= maxAttempts) {
      const errorText = await response.text();
      throw new Error(`${this.provider} request failed: ${response.status} ${response.statusText} ${errorText}`);
    }

    const isDailyQuotaExceeded = await this.isDailyQuotaExceeded(response);
    if (isDailyQuotaExceeded) {
      throw this.buildQuotaExceededError(response);
    }

    const delayMs = await this.extractRetryDelay(response, attempt, baseDelayMs);
    await this.sleep(delayMs);
    return this.requestWithRetry(url, body, attempt + 1);
  }

  private async isDailyQuotaExceeded(response: Response): Promise<boolean> {
    try {
      const text = await response.clone().text();
      const parsed = JSON.parse(text);
      const quotaFailure = parsed?.error?.details?.find((detail: any) => detail["@type"]?.includes("QuotaFailure"));
      if (quotaFailure) {
        const violations = quotaFailure.violations || [];
        return violations.some((violation: any) => violation.quotaId?.includes("FreeTier"));
      }
      
      const groqError = parsed?.error;
      if (groqError?.code === "rate_limit_exceeded" || groqError?.type === "tokens") {
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  private async extractRetryDelay(response: Response, attempt: number, baseDelayMs: number): Promise<number> {
    const clampedAttempt = Math.max(attempt, 1);
    const exponentialDelay = baseDelayMs * Math.pow(2, clampedAttempt - 1);
    const jitter = Math.random() * 250;

    try {
      const text = await response.clone().text();
      const parsed = JSON.parse(text);
      const retryInfo = parsed?.error?.details?.find((detail: any) => detail["@type"]?.includes("RetryInfo"));
      const retryDelay = retryInfo?.retryDelay;
      if (typeof retryDelay === "string") {
        const seconds = parseFloat(retryDelay) || 0;
        if (Number.isFinite(seconds) && seconds > 0) {
          const ms = Math.max(seconds * 1000, 1000);
          return Math.min(ms, 60000);
        }
      }

      const groqMessage = parsed?.error?.message;
      if (typeof groqMessage === "string") {
        const groqMatch = groqMessage.match(/try again in (\d+\.?\d*)s/);
        if (groqMatch) {
          const seconds = parseFloat(groqMatch[1]) || 0;
          if (Number.isFinite(seconds) && seconds > 0) {
            const ms = Math.max(seconds * 1000, 1000);
            return Math.min(ms, 60000);
          }
        }
      }
    } catch {
      // ignore parse errors and fall back to exponential backoff
    }

    return Math.min(exponentialDelay + jitter, 60000);
  }

  private buildQuotaExceededError(_response: Response): Error {
    if (this.provider === "openai") {
      return new Error(
        "OpenAI quota exceeded. Please check your plan and billing at https://platform.openai.com/usage, upgrade your plan, or try again later."
      );
    }
    if (this.provider === "groq") {
      return new Error(
        "Groq quota exceeded. Please check your plan and billing at https://console.groq.com/keys, upgrade your plan, or try again later."
      );
    }
    if (this.provider === "openrouter") {
      return new Error(
        "OpenRouter quota exceeded. Please check your plan and billing at https://openrouter.ai/account, upgrade your plan, or try again later."
      );
    }
    return new Error(
      "Gemini free-tier quota exceeded. Please check your plan/billing at https://ai.google.dev/gemini-api/docs/rate-limits, upgrade your plan, or try again after the quota resets."
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
