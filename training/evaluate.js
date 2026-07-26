import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const CONFIG_PATH = path.resolve("training/training_config.json");
const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf-8"));

const provider = config.provider || process.env.LLM_PROVIDER || "openai";

// Sample evaluation questions based on architectural domain
const EVAL_QUESTIONS = [
  "What are the key considerations for designing a 4-bedroom residential building?",
  "Describe the structural requirements for a multi-story apartment building.",
  "What materials are recommended for exterior walls in a tropical climate?",
  "How do you calculate the floor area ratio for a residential project?",
  "What are the ventilation requirements for buildings in Uganda?",
  "Explain the difference between load-bearing and non-load-bearing walls.",
  "What permits are required for construction in Uganda?",
  "How do you design for energy efficiency in a warm humid climate?",
  "What are the standard room dimensions for a modern family home?",
  "Describe the process of creating a bill of quantities for a construction project."
];

async function evaluateOpenAI(modelId) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for evaluation");
  }

  console.log(`Evaluating model: ${modelId}`);
  console.log(`Questions: ${EVAL_QUESTIONS.length}\n`);

  const results = [];

  for (let i = 0; i < EVAL_QUESTIONS.length; i++) {
    const question = EVAL_QUESTIONS[i];
    console.log(`[${i + 1}/${EVAL_QUESTIONS.length}] ${question}`);

    const startTime = Date.now();
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: "You are an expert architectural assistant." },
            { role: "user", content: question }
          ],
          max_tokens: 500,
          temperature: 0.2,
        }),
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const error = await response.text();
        console.log(`  Error: ${response.status} ${error}`);
        results.push({
          question,
          error: `HTTP ${response.status}: ${error}`,
          latency,
        });
        continue;
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || "";
      
      // Simple quality metrics
      const wordCount = answer.split(/\s+/).length;
      const hasArchitecturalTerms = /\b(building|construction|design|material|structure|floor|wall|roof|foundation|concrete|steel)\b/i.test(answer);
      
      results.push({
        question,
        answer: answer.substring(0, 200) + "...",
        wordCount,
        hasArchitecturalTerms,
        latency,
        finishReason: data.choices?.[0]?.finish_reason,
      });

      console.log(`  Response: ${wordCount} words, architectural terms: ${hasArchitecturalTerms ? "yes" : "no"}, ${latency}ms`);

    } catch (error) {
      console.log(`  Error: ${error.message}`);
      results.push({
        question,
        error: error.message,
        latency: Date.now() - startTime,
      });
    }
  }

  // Calculate summary metrics
  const successful = results.filter((r) => !r.error);
  const avgLatency = successful.length > 0 
    ? Math.round(successful.reduce((sum, r) => sum + r.latency, 0) / successful.length)
    : 0;
  const avgWordCount = successful.length > 0 
    ? Math.round(successful.reduce((sum, r) => sum + r.wordCount, 0) / successful.length)
    : 0;
  const architecturalTermRate = successful.length > 0 
    ? Math.round((successful.filter((r) => r.hasArchitecturalTerms).length / successful.length) * 100)
    : 0;

  const evaluation = {
    model_id: modelId,
    evaluated_at: new Date().toISOString(),
    questions: EVAL_QUESTIONS.length,
    successful_responses: successful.length,
    failed_responses: results.length - successful.length,
    avg_latency_ms: avgLatency,
    avg_word_count: avgWordCount,
    architectural_term_rate: architecturalTermRate,
    results,
  };

  // Save evaluation
  const evalPath = path.join(
    config.evaluation_dir,
    `evaluation_${Date.now()}.json`
  );
  await fs.mkdir(config.evaluation_dir, { recursive: true });
  await fs.writeFile(evalPath, JSON.stringify(evaluation, null, 2), "utf-8");

  console.log("\n" + "="*70);
  console.log("EVALUATION SUMMARY");
  console.log("="*70);
  console.log(`Questions: ${EVAL_QUESTIONS.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${results.length - successful.length}`);
  console.log(`Avg latency: ${avgLatency}ms`);
  console.log(`Avg response length: ${avgWordCount} words`);
  console.log(`Architectural terms: ${architecturalTermRate}%`);
  console.log(`\nResults saved: ${evalPath}`);

  return evaluation;
}

async function evaluateRAG(useRAG = true) {
  console.log("="*70);
  console.log("RAG EVALUATION MODE");
  console.log("="*70);
  
  if (!useRAG) {
    console.log("RAG disabled - evaluating base model only");
    return;
  }

  // For RAG evaluation, we'd:
  // 1. Load corpus chunks
  // 2. For each question, retrieve top-k chunks
  // 3. Generate response with context
  // 4. Evaluate quality
  
  console.log("RAG evaluation requires:");
  console.log("1. Corpus embeddings (run Cell 6 first)");
  console.log("2. Vector index for retrieval");
  console.log("3. Generation model (fine-tuned or base)");
  console.log("\nSee evaluate_rag.py for full RAG evaluation pipeline");
}

async function main() {
  console.log("="*70);
  console.log("MODEL EVALUATION");
  console.log("="*70);

  try {
    if (provider === "openai") {
      // Use latest fine-tuned model or base model
      const modelId = process.env.OPENAI_FINE_TUNED_MODEL || config.base_model;
      await evaluateOpenAI(modelId);
    } else {
      await evaluateRAG(false);
    }
  } catch (error) {
    console.error("Evaluation failed:", error.message);
    process.exit(1);
  }
}

main();
