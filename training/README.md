# Training Pipeline

This folder contains scripts to fine-tune and evaluate the Architect Agent model.

## Prerequisites

```bash
npm install
```

## Setup

1. Place your training data in `training/data/training_data_clean.jsonl`
2. Configure `training/training_config.json` with your settings
3. Set environment variables in `.env`:
   - `OPENAI_API_KEY` - for OpenAI fine-tuning
   - `LLM_PROVIDER=openai` - to use OpenAI

## Quick Start

### 1. Split dataset into train/validation

```bash
npm run training:split
```

This creates:
- `training/data/training_data_clean.jsonl` (80% for training)
- `training/data/validation_data.jsonl` (20% for validation)

### 2. Train the model (OpenAI)

```bash
npm run training:train
```

This will:
- Upload your training and validation files to OpenAI
- Start a fine-tuning job
- Poll until completion
- Save the model ID to `training/outputs/`

### 3. Evaluate the model

```bash
npm run training:evaluate
```

This tests the fine-tuned model against 10 architectural questions and reports:
- Success rate
- Average response latency
- Average response length
- Architectural term usage rate
- Per-question breakdown

## Configuration

Edit `training_config.json`:

```json
{
  "training_file": "training/data/training_data_clean.jsonl",
  "validation_file": "training/data/validation_data.jsonl",
  "base_model": "gpt-4o-mini",
  "provider": "openai",
  "hyperparameters": {
    "n_epochs": 3,
    "batch_size": 4,
    "learning_rate_multiplier": 0.2
  }
}
```

## For Gemini

Gemini does not support fine-tuning via API. Use RAG instead:
1. Run `training:split`
2. Use `chunks_clean.jsonl` for embeddings
3. Build a vector index
4. Use retrieval-augmented generation

## Notes

- Fine-tuning requires an OpenAI account with billing enabled
- Training time depends on dataset size and model
- Estimated cost for ~400 examples: ~$0.50 - $2.00
- Validation split is 20% of training data by default
