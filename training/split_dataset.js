import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const CONFIG_PATH = path.resolve("training/training_config.json");
const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf-8"));

async function splitDataset() {
  const trainingPath = path.resolve(config.training_file);
  const validationPath = path.resolve(config.validation_file);

  const content = await fs.readFile(trainingPath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  console.log(`Total examples: ${lines.length}`);

  // Shuffle and split 80/20
  const shuffled = lines.sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * 0.8);
  const trainLines = shuffled.slice(0, splitIndex);
  const valLines = shuffled.slice(splitIndex);

  await fs.writeFile(trainingPath, trainLines.join("\n") + "\n", "utf-8");
  await fs.writeFile(validationPath, valLines.join("\n") + "\n", "utf-8");

  console.log(`Training examples: ${trainLines.length}`);
  console.log(`Validation examples: ${valLines.length}`);
  console.log(`Saved to:`);
  console.log(`  Train: ${trainingPath}`);
  console.log(`  Validation: ${validationPath}`);
}

splitDataset().catch((error) => {
  console.error("Failed to split dataset:", error);
  process.exit(1);
});
