import dotenv from "dotenv";
import { GeminiClient } from "./geminiClient.js";
import { VectorStore } from "./vectorStore.js";
import { ArchitectAgent } from "./agent.js";

dotenv.config();

async function main(): Promise<void> {
  const [mode, ...rest] = process.argv.slice(2);
  const rawInput = rest.join(" ").trim();

  const client = new GeminiClient();
  const store = new VectorStore(client);
  const agent = new ArchitectAgent(client, store);
  await agent.init();

  switch (mode) {
    case "brief": {
      const brief = await agent.interpretBrief(rawInput || "");
      console.log("=== Interpreted Project Brief ===\n");
      console.log(JSON.stringify(brief, null, 2));
      break;
    }
    case "concept": {
      const brief = await agent.interpretBrief(rawInput);
      const concept = await agent.createConcept(brief);
      console.log("=== Concept Design ===\n");
      console.log(JSON.stringify(concept, null, 2));
      break;
    }
    case "space": {
      const brief = await agent.interpretBrief(rawInput);
      const plan = await agent.planSpace(brief);
      console.log("=== Space Plan ===\n");
      console.log(JSON.stringify(plan, null, 2));
      break;
    }
    case "boq": {
      const brief = await agent.interpretBrief(rawInput);
      const boq = await agent.generateBOQ(brief);
      console.log("=== BOQ ===\n");
      console.log(JSON.stringify(boq, null, 2));
      break;
    }
    case "cost": {
      const brief = await agent.interpretBrief(rawInput);
      const estimate = await agent.estimateCost(brief);
      console.log("=== Cost Estimate ===\n");
      console.log(JSON.stringify(estimate, null, 2));
      break;
    }
    case "suppliers": {
      const brief = await agent.interpretBrief(rawInput);
      const suppliers = await agent.recommendSuppliers(brief);
      console.log("=== Supplier Recommendations ===\n");
      console.log(JSON.stringify(suppliers, null, 2));
      break;
    }
    case "structure": {
      const brief = await agent.interpretBrief(rawInput);
      const structure = await agent.adviseStructure(brief);
      console.log("=== Structural Suggestions ===\n");
      console.log(JSON.stringify(structure, null, 2));
      break;
    }
    case "workflow":
    case "generate": {
      const outputFiles = await agent.executeWorkflow(rawInput);
      console.log("Generated project package files:");
      outputFiles.forEach((file) => console.log(`- ${file}`));
      break;
    }
    default: {
      const question = [mode, ...rest].join(" ").trim() || "Describe a resilient mixed-use building strategy for an urban site.";
      const response = await agent.answerQuestion(question);
      console.log("=== Agent Response ===\n");
      console.log(response);
      break;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
