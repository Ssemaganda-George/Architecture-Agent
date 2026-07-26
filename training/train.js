import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const CONFIG_PATH = path.resolve("training/training_config.json");
const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf-8"));

const provider = config.provider || process.env.LLM_PROVIDER || "openai";

async function trainOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI fine-tuning");
  }

  console.log("Uploading training file to OpenAI...");
  const trainingFile = await uploadFile(config.training_file, apiKey);
  console.log(`Training file uploaded: ${trainingFile.id}`);

  if (config.validation_file) {
    console.log("Uploading validation file to OpenAI...");
    const validationFile = await uploadFile(config.validation_file, apiKey);
    console.log(`Validation file uploaded: ${validationFile.id}`);
  }

  console.log("Starting fine-tuning job...");
  const job = await createFineTuneJob(trainingFile.id, config, apiKey);
  console.log(`Fine-tuning job created: ${job.id}`);
  console.log(`Status: ${job.status}`);

  // Poll for completion
  let currentJob = job;
  while (currentJob.status === "queued" || currentJob.status === "running") {
    await sleep(30000);
    currentJob = await getFineTuneJob(currentJob.id, apiKey);
    console.log(`Status: ${currentJob.status} (elapsed: ${currentJob.training_completed ? 'done' : 'in progress'})`);
  }

  if (currentJob.status === "succeeded") {
    console.log(`\nFine-tuning complete!`);
    console.log(`Model ID: ${currentJob.fine_tuned_model}`);
    console.log(`Trained tokens: ${currentJob.trained_tokens}`);
    
    // Save model info
    const modelInfo = {
      model_id: currentJob.fine_tuned_model,
      job_id: currentJob.id,
      status: currentJob.status,
      trained_tokens: currentJob.trained_tokens,
      training_file: trainingFile.id,
      validation_file: config.validation_file,
      hyperparameters: config.hyperparameters,
      created_at: new Date().toISOString()
    };
    
    const outputPath = path.join(config.output_dir, `model_${Date.now()}.json`);
    await fs.mkdir(config.output_dir, { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(modelInfo, null, 2), "utf-8");
    console.log(`Model info saved: ${outputPath}`);
    
    return currentJob.fine_tuned_model;
  } else {
    throw new Error(`Fine-tuning failed: ${currentJob.status}`);
  }
}

async function uploadFile(filePath, apiKey) {
  const FormData = (await import("form-data")).default;
  const fs = await import("fs");
  const path = await import("path");
  
  const fileContent = await fs.readFile(filePath);
  const fileName = path.basename(filePath);
  
  const form = new FormData();
  form.append("file", fileContent, {
    filename: fileName,
    contentType: "application/jsonl",
  });
  form.append("purpose", "fine-tune");

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload file: ${response.status} ${error}`);
  }

  return response.json();
}

async function createFineTuneJob(trainingFileId, config, apiKey) {
  const body = {
    training_file: trainingFileId,
    model: config.base_model,
    hyperparameters: {
      n_epochs: config.hyperparameters.n_epochs || 3,
      batch_size: config.hyperparameters.batch_size || 4,
      learning_rate_multiplier: config.hyperparameters.learning_rate_multiplier || 0.2,
    },
  };

  if (config.validation_file) {
    body.validation_file = path.basename(config.validation_file).replace(/\./g, "_");
  }

  const response = await fetch("https://api.openai.com/v1/fine_tuning/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create fine-tune job: ${response.status} ${error}`);
  }

  return response.json();
}

async function getFineTuneJob(jobId, apiKey) {
  const response = await fetch(`https://api.openai.com/v1/fine_tuning/jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get job status: ${response.status} ${error}`);
  }

  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("="*70);
  console.log("TRAINING PIPELINE");
  console.log("="*70);
  console.log(`Provider: ${provider}`);
  console.log(`Base model: ${config.base_model}`);
  console.log(`Training file: ${config.training_file}`);
  console.log(`Validation file: ${config.validation_file}`);
  console.log(`Hyperparameters: ${JSON.stringify(config.hyperparameters)}`);
  console.log();

  try {
    if (provider === "openai") {
      const modelId = await trainOpenAI();
      console.log(`\nTraining complete! Model: ${modelId}`);
    } else {
      // Gemini: no fine-tuning API available, use RAG
      console.log("Gemini provider does not support fine-tuning via API.");
      console.log("Use RAG instead. See training/evaluate.js for evaluation.");
    }
  } catch (error) {
    console.error("Training failed:", error.message);
    process.exit(1);
  }
}

main();
