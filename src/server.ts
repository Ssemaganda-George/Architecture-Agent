import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { ArchitectAgent } from "./agent.js";
import { GeminiClient } from "./geminiClient.js";
import { VectorStore } from "./vectorStore.js";
import ExcelJS from "exceljs";
import { generateDXF } from "./tools/dxfGenerator.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

let agent: ArchitectAgent | null = null;
let latestBrief: any = null;
let store: VectorStore | null = null;

function getDevMock(text?: string) {
  const projectSummary = text || "Sample brief: 1000, 10 rooms, 2 floors";
  const brief = { projectSummary, buildingType: "Residential", bedrooms: 10, floors: 2, budget: "$1000" };
  const concept = { conceptStatement: "Compact multi-room layout", designPhilosophy: "Efficient circulation", materialRecommendations: ["Timber", "Local brick"], colorPalette: ["Neutral"] };
  const spacePlan = { floorPlanSummary: "Two floors with distributed rooms", roomRelationships: "Clustered bedrooms", circulationStrategy: "Central staircase" };
  const boq = [{ category: "Masonry", item: "Bricks", quantity: 1000, unit: "pcs", rate: 0.5, amount: 500 }];
  const cost = { totalCost: 1000, currency: "USD", labour: 400, materials: 500, equipment: 50, transport: 20, professionalFees: 20, contingency: 10 };
  const suppliers = [{ materialCategory: "Bricks", supplierName: "Local Bricks Ltd", price: "$0.5/pc", location: "Local" }];
  const structure = { foundation: "Strip foundation", slabThickness: "120mm", columnSizes: "200x200mm" };
  return { brief, concept, spacePlan, boq, cost, suppliers, structure };
}

async function initAgent() {
  const client = new GeminiClient();
  const storeLocal = new VectorStore(client);
  agent = new ArchitectAgent(client, storeLocal);
  await agent.init();
  store = storeLocal;
}

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

function summarizeText(text: string, maxLen = 200) {
  // naive summary: first sentence or trimmed first maxLen chars
  const m = text.match(/([^.?!]+[.?!])/);
  if (m && m[0]) return m[0].trim();
  return text.slice(0, maxLen).trim();
}

function extractTags(text: string, topK = 6) {
  const stop = new Set([
    "the","and","a","an","of","in","on","for","with","to","is","are","by","as","at","from","this","that","it","be"
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !stop.has(w) && w.length > 2);
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topK).map((t) => t[0]);
}

app.post("/api/init", async (_req, res) => {
  try {
    if (!agent || !store) {
      await initAgent();
    }
    res.json({ status: "ready" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Initialization failed";
    let userMessage = "Failed to initialize agent.";
    
    if (message.includes("No LLM provider configured")) {
      userMessage = "Configuration error: No LLM API key found. Please set OPENROUTER_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY in environment variables.";
    } else if (message.includes("API key is required")) {
      userMessage = `Configuration error: ${message}`;
    } else if (message.includes("quota exceeded") || message.includes("Rate limit")) {
      userMessage = `API quota exceeded: ${message}. Please check your plan/billing or try again later.`;
    } else if (message.includes("does not exist") || message.includes("model_not_found")) {
      userMessage = `Model error: ${message}. Please check your model name in environment variables.`;
    } else if (message.includes("ENOENT") || message.includes("ECONNREFUSED") || message.includes("ETIMEDOUT") || message.includes("network")) {
      userMessage = `Network error: ${message}. Please check your internet connection or API endpoint configuration.`;
    } else if (message.includes("Failed to verify")) {
      userMessage = `Service unavailable: ${message}. The AI service may be down or unreachable.`;
    } else {
      userMessage = `Initialization error: ${message}`;
    }
    
    res.status(500).json({ error: userMessage });
  }
});

app.post("/api/brief", async (req, res) => {
  try {
    const { text } = req.body;
    if (!agent) return res.status(503).json({ error: "Agent not initialized" });
    const brief = await agent.interpretBrief(text || "");
    latestBrief = brief;
    res.json(brief);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    // If running locally in development, return mock data so frontend can be tested
    if (process.env.NODE_ENV !== "production") {
      const reqText = (req && (req as any).body && (req as any).body.text) || "";
      const mockBrief = { projectSummary: reqText || "Sample brief", buildingType: "Residential", bedrooms: 3, budget: "$50,000" };
      const mockConcept = { conceptStatement: "Compact modern 3-bedroom house", designPhilosophy: "Sustainable, compact living", materialRecommendations: ["Timber", "Bamboo"], colorPalette: ["White","Warm wood"] };
      const mockSpace = { floorPlanSummary: "Two-storey, open plan living", roomRelationships: "Living-Kitchen connected", circulationStrategy: "Central corridor" };
      const mockBOQ = [{ category: "Concrete", item: "Foundation concrete", quantity: 10, unit: "m3", rate: 100, amount: 1000 }];
      const mockCost = { totalCost: 50000, currency: "USD", labour: 15000, materials: 30000, equipment: 2000, transport: 500, professionalFees: 1500, contingency: 1000 };
      const mockSuppliers = [{ materialCategory: "Concrete", supplierName: "Local Concrete Co.", price: "$100/m3", location: "Local" }];
      const mockStructure = { foundation: "Strip footing", slabThickness: "150mm", columnSizes: "300x300mm" };
      res.json({ brief: mockBrief, concept: mockConcept, spacePlan: mockSpace, boq: mockBOQ, cost: mockCost, suppliers: mockSuppliers, structure: mockStructure, _mock: true });
      return;
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/concept", async (req, res) => {
  try {
    const { text } = req.body;
    if (!agent) return res.status(503).json({ error: "Agent not initialized" });
    const brief = await agent.interpretBrief(text || "");
    const concept = await agent.createConcept(brief);
    res.json(concept);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (process.env.NODE_ENV !== "production") {
      const mock = getDevMock((req as any).body?.text);
      res.json(mock.concept);
      return;
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/space", async (req, res) => {
  try {
    const { text } = req.body;
    if (!agent) return res.status(503).json({ error: "Agent not initialized" });
    const brief = await agent.interpretBrief(text || "");
    latestBrief = brief;
    const plan = await agent.planSpace(brief);
    res.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (process.env.NODE_ENV !== "production") {
      const mock = getDevMock((req as any).body?.text);
      res.json(mock.spacePlan);
      return;
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/boq", async (req, res) => {
  try {
    const { text } = req.body;
    if (!agent) return res.status(503).json({ error: "Agent not initialized" });
    const brief = await agent.interpretBrief(text || "");
    latestBrief = brief;
    const boq = await agent.generateBOQ(brief);
    res.json(boq);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (process.env.NODE_ENV !== "production") {
      const mock = getDevMock((req as any).body?.text);
      res.json(mock.boq);
      return;
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/cost", async (req, res) => {
  try {
    const { text } = req.body;
    if (!agent) return res.status(503).json({ error: "Agent not initialized" });
    const brief = await agent.interpretBrief(text || "");
    latestBrief = brief;
    const cost = await agent.estimateCost(brief);
    res.json(cost);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (process.env.NODE_ENV !== "production") {
      const mock = getDevMock((req as any).body?.text);
      res.json(mock.cost);
      return;
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/suppliers", async (req, res) => {
  try {
    const { text } = req.body;
    if (!agent) return res.status(503).json({ error: "Agent not initialized" });
    const brief = await agent.interpretBrief(text || "");
    const suppliers = await agent.recommendSuppliers(brief);
    res.json(suppliers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (process.env.NODE_ENV !== "production") {
      const mock = getDevMock((req as any).body?.text);
      res.json(mock.suppliers);
      return;
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/structure", async (req, res) => {
  try {
    const { text } = req.body;
    if (!agent) return res.status(503).json({ error: "Agent not initialized" });
    const brief = await agent.interpretBrief(text || "");
    const structure = await agent.adviseStructure(brief);
    res.json(structure);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (process.env.NODE_ENV !== "production") {
      const mock = getDevMock((req as any).body?.text);
      res.json(mock.structure);
      return;
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/workflow", async (req, res) => {
  try {
    const { text } = req.body;
    if (!agent) return res.status(503).json({ error: "Agent not initialized" });
    latestBrief = await agent.interpretBrief(text || "");
    const files = await agent.executeWorkflow(text || "");
    res.json({ files });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (process.env.NODE_ENV !== "production") {
      const mock = getDevMock((req as any).body?.text);
      latestBrief = mock.brief;
      res.json({ brief: mock.brief, concept: mock.concept, spacePlan: mock.spacePlan, boq: mock.boq, cost: mock.cost, suppliers: mock.suppliers, structure: mock.structure, _mock: true });
      return;
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { text, history } = req.body;
    if (!agent) return res.status(503).json({ error: "Agent not initialized" });
    const answer = await agent.answerQuestion(text || "", latestBrief || undefined, Array.isArray(history) ? history : []);
    res.json({ text: answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (process.env.NODE_ENV !== "production") {
      const reqText = (req && (req as any).body && (req as any).body.text) || "";
      const mock = getDevMock(reqText);
      latestBrief = mock.brief;
      const answer = `Project Brief Summary:\n${mock.brief.projectSummary || reqText}\n\nConcept:\n${mock.concept.conceptStatement}\nDesign philosophy: ${mock.concept.designPhilosophy}\nMaterials: ${Array.isArray(mock.concept.materialRecommendations) ? mock.concept.materialRecommendations.join(', ') : mock.concept.materialRecommendations}\n\nSpace Plan:\n${mock.spacePlan.floorPlanSummary}\nCirculation: ${mock.spacePlan.circulationStrategy}\nRoom relationships: ${mock.spacePlan.roomRelationships || mock.spacePlan.roomRelationships}\n\nBOQ (high level):\n- ${mock.boq[0].category}: ${mock.boq[0].item} — ${mock.boq[0].quantity || ''} ${mock.boq[0].unit || ''} @ ${mock.boq[0].rate || ''} => ${mock.boq[0].amount || ''}\n\nCost Estimate: ${mock.cost.totalCost} ${mock.cost.currency || ''}\nBreakdown: labour ${mock.cost.labour}, materials ${mock.cost.materials}, equipment ${mock.cost.equipment}\n\nSuppliers (samples):\n- ${mock.suppliers[0].supplierName} (${mock.suppliers[0].materialCategory}) — ${mock.suppliers[0].price || ''}\n\nStructural suggestions:\n- Foundation: ${mock.structure.foundation}\n- Slab thickness: ${mock.structure.slabThickness}\n- Column sizes: ${mock.structure.columnSizes}\n\nAnswer to your question:\nBased on the brief and local references, recommended next steps:\n1) Confirm site orientation and constraints.\n2) Develop a quick area schedule and room adjacency matrix.\n3) Produce a concept sketch and preliminary BOQ.\n4) Engage local supplier for firm pricing.\n\nIf you want, I can generate downloadable Excel files for the concept and BOQ, or refine the BOQ with regional rates.`;
      res.json({ text: answer, _mock: true });
      return;
    }
    res.status(500).json({ error: message });
  }
});

// Combined generation endpoint: interpret brief and return all outputs
app.post("/api/generate", async (req, res) => {
  try {
    const { text } = req.body;
    if (!agent) return res.status(503).json({ error: "Agent not initialized" });
    const brief = await agent.interpretBrief(text || "");
    latestBrief = brief;

    const [concept, spacePlan, boq, cost, suppliers, structure] = await Promise.all([
      agent.createConcept(brief),
      agent.planSpace(brief),
      agent.generateBOQ(brief),
      agent.estimateCost(brief),
      agent.recommendSuppliers(brief),
      agent.adviseStructure(brief),
    ]);

    res.json({ brief, concept, spacePlan, boq, cost, suppliers, structure });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    res.status(500).json({ error: message });
  }
});

// Ingest plain text into vector store (splits into chunks and embeds)
app.post("/api/ingest", async (req, res) => {
  try {
    const { text, collection, source } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text to ingest" });
    if (!store) return res.status(503).json({ error: "Vector store not initialized" });

    const chunks = chunkText(text, 800, 100);
    const ids: string[] = [];
    const summaries: string[] = [];
    const tagsList: string[][] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const id = `${source || 'upload'}-${Date.now()}-${i}`;
      const summary = summarizeText(chunk, 200);
      const tags = extractTags(chunk, 6);
      await store.addDocument({ id, text: chunk, metadata: { source: source || 'upload', collection: collection || 'dataset', summary, tags: JSON.stringify(tags) } });
      ids.push(id);
      summaries.push(summary);
      tagsList.push(tags);
    }

    res.json({ ingested: ids.length, ids, summaries, tags: tagsList });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    res.status(500).json({ error: message });
  }
});

// Download concept as Excel
app.post("/api/download/concept", async (req, res) => {
  try {
    const { concept } = req.body;
    if (!concept) return res.status(400).json({ error: "Missing concept data" });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Concept");
    sheet.columns = [{ header: "Field", key: "field", width: 30 }, { header: "Value", key: "value", width: 80 }];
    Object.entries(concept).forEach(([k, v]) => {
      sheet.addRow({ field: k, value: typeof v === "string" ? v : JSON.stringify(v) });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=concept.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    res.status(500).json({ error: message });
  }
});

// Download BOQ as Excel
app.post("/api/download/boq", async (req, res) => {
  try {
    const { boq } = req.body;
    if (!Array.isArray(boq)) return res.status(400).json({ error: "Missing or invalid BOQ data" });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("BOQ");
    // attempt to infer columns
    const cols = ["category", "item", "quantity", "unit", "rate", "amount"];
    sheet.columns = cols.map((c) => ({ header: c.toUpperCase(), key: c, width: 20 }));
    boq.forEach((row: any) => {
      const r: any = {};
      cols.forEach((c) => (r[c] = row[c] ?? ""));
      sheet.addRow(r);
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=boq.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    res.status(500).json({ error: message });
  }
});

// Download space plan as DXF
app.post("/api/download/dxf", async (req, res) => {
  try {
    const { spacePlan } = req.body;
    if (!spacePlan) return res.status(400).json({ error: "Missing space plan data" });

    const dxf = generateDXF(spacePlan);
    res.setHeader("Content-Type", "application/dxf");
    res.setHeader("Content-Disposition", `attachment; filename=floorplan.dxf`);
    res.send(dxf);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    res.status(500).json({ error: message });
  }
});

const PORT = process.env.PORT || 3003;

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Architect Agent UI ready at http://localhost:${PORT}`);
});
