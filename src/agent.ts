import { GeminiClient } from "./geminiClient.js";
import { VectorStore } from "./vectorStore.js";
import { KnowledgeRetriever } from "./tools/knowledgeRetriever.js";
import { BriefInterpreter } from "./tools/briefInterpreter.js";
import { ConceptDesigner } from "./tools/conceptDesigner.js";
import { SpacePlanner } from "./tools/spacePlanner.js";
import { BOQGenerator } from "./tools/boqGenerator.js";
import { CostEstimator } from "./tools/costEstimator.js";
import { SupplierIntelligence } from "./tools/supplierIntelligence.js";
import { StructuralAdvisor } from "./tools/structuralAdvisor.js";
import { ReportGenerator } from "./tools/reportGenerator.js";
import { FileGenerationTool } from "./tools/fileGeneration.js";
import { ProjectBrief, ConceptDesign, SpacePlan, BOQItem, CostBreakdown, SupplierRecommendation, StructuralSuggestion, ProjectReport } from "./types.js";

export class ArchitectAgent {
  private mockMode = false;
  private client: GeminiClient;
  private store: VectorStore;
  private retriever: KnowledgeRetriever;
  private briefInterpreter: BriefInterpreter;
  private conceptDesigner: ConceptDesigner;
  private spacePlanner: SpacePlanner;
  private boqGenerator: BOQGenerator;
  private costEstimator: CostEstimator;
  private supplierIntelligence: SupplierIntelligence;
  private structuralAdvisor: StructuralAdvisor;
  private reportGenerator: ReportGenerator;
  private fileTool: FileGenerationTool;

  constructor(client: GeminiClient, store: VectorStore) {
    this.client = client;
    this.store = store;
    this.retriever = new KnowledgeRetriever(store);
    this.briefInterpreter = new BriefInterpreter(client);
    this.conceptDesigner = new ConceptDesigner(client);
    this.spacePlanner = new SpacePlanner(client);
    this.boqGenerator = new BOQGenerator(client);
    this.costEstimator = new CostEstimator(client);
    this.supplierIntelligence = new SupplierIntelligence(client);
    this.structuralAdvisor = new StructuralAdvisor(client);
    this.reportGenerator = new ReportGenerator();
    this.fileTool = new FileGenerationTool();
  }

  async init(): Promise<void> {
    try {
      await this.client.verifyEndpoints();
    } catch (err) {
      console.warn("LLM endpoint verification failed:", err instanceof Error ? err.message : err);
      if (process.env.NODE_ENV !== "production") {
        console.warn("Falling back to mock mode for local development.");
        this.mockMode = true;
      } else {
        throw err;
      }
    }

    try {
      await this.retriever.initialize();
    } catch (err) {
      console.warn("Knowledge retriever initialization failed:", err instanceof Error ? err.message : err);
      if (process.env.NODE_ENV !== "production") {
        console.warn("Continuing in mock mode without retriever.");
        this.mockMode = true;
      } else {
        throw err;
      }
    }
  }

  // Development mock helpers when LLM is unavailable
  private mockBrief(rawBrief: string) {
    return {
      projectSummary: rawBrief || "Sample brief: 1000, 10 rooms, 2 floors",
      buildingType: "Residential",
      bedrooms: 10,
      budget: "$1000",
      plotSize: "N/A",
    } as any;
  }

  private mockConcept() {
    return {
      conceptStatement: "Compact multi-room layout",
      designPhilosophy: "Efficient circulation",
      materialRecommendations: ["Timber", "Local brick"],
      colorPalette: ["Neutral"],
    } as any;
  }

  private mockSpace() {
    return {
      floorPlanSummary: "Two floors with distributed rooms",
      roomRelationships: "Clustered bedrooms",
      circulationStrategy: "Central staircase",
    } as any;
  }

  private mockBOQ() {
    return [{ category: "Masonry", item: "Bricks", quantity: 1000, unit: "pcs", rate: 0.5, amount: 500 } as any];
  }

  private mockCost() {
    return { totalCost: 1000, currency: "USD", labour: 400, materials: 500, equipment: 50, transport: 20, professionalFees: 20, contingency: 10 } as any;
  }

  private mockSuppliers() {
    return [{ materialCategory: "Bricks", supplierName: "Local Bricks Ltd", price: "$0.5/pc", location: "Local" } as any];
  }

  private mockStructure() {
    return { foundation: "Strip foundation", slabThickness: "120mm", columnSizes: "200x200mm" } as any;
  }

  async answerQuestion(question: string, brief?: any, history: Array<{ role: string; text: string }> = []): Promise<string> {
    const context = await this.retriever.retrieveCorpusContext(question);
    const external = await this.retriever.retrieveExternalContext(question);

    const historyText = history.length > 0
      ? history.map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n')
      : '';

    if (this.mockMode) {
      const interpreted = brief || this.mockBrief(question);
      const concept = await this.createConcept(interpreted);
      const plan = await this.planSpace(interpreted);
      const boq = await this.generateBOQ(interpreted);
      const cost = await this.estimateCost(interpreted);
      const suppliers = await this.recommendSuppliers(interpreted);
      const structure = await this.adviseStructure(interpreted);

      const localSnippet = (context || '').slice(0, 1200);
      const externalSnippet = (external || '').slice(0, 800);

      let out = historyText ? `Context from earlier conversation:\n${historyText}\n\n` : '';
      out += `Based on your question: "${question}"\n\n`;
      if (localSnippet) {
        out += `From local architectural references:\n${localSnippet}\n\n`;
      }
      if (externalSnippet) {
        out += `From external sources:\n${externalSnippet}\n\n`;
      }
      out += `Project context:\n`;
      out += `- Brief: ${interpreted.projectSummary || 'Not provided'}\n`;
      out += `- Concept: ${concept.conceptStatement}\n`;
      out += `- Space plan: ${plan.floorPlanSummary}\n`;
      out += `- Structural: ${structure.foundation}, ${structure.slabThickness}\n\n`;
      out += `Recommendation:\n`;
      const q = question.toLowerCase();
      if (q.includes('budget') || q.includes('cost') || q.includes('price')) {
        out += `Estimated total cost: ${cost.totalCost} ${cost.currency} (labour ${cost.labour}, materials ${cost.materials}). Consider ${concept.materialRecommendations?.length ? concept.materialRecommendations[0] : 'standard materials'} to optimize spend.`;
      } else if (q.includes('material') || q.includes('supplier')) {
        out += `Recommended materials: ${concept.materialRecommendations?.join(', ') || 'N/A'}. Suppliers: ${suppliers?.length ? suppliers[0].supplierName : 'N/A'} at ${suppliers?.[0]?.price || ''}.`;
      } else if (q.includes('structure') || q.includes('foundation') || q.includes('slab')) {
        out += `Foundation: ${structure.foundation}. Slab: ${structure.slabThickness}. Columns: ${structure.columnSizes}. ${structure.disclaimer || ''}`;
      } else if (q.includes('space') || q.includes('room') || q.includes('plan')) {
        out += `Circulation strategy: ${plan.circulationStrategy}. Room relationships: ${plan.roomRelationships || 'N/A'}. Layout: ${plan.floorPlanSummary}`;
      } else if (q.includes('concept') || q.includes('design') || q.includes('style')) {
        out += `Design philosophy: ${concept.designPhilosophy}. Concept statement: ${concept.conceptStatement}. Palette: ${concept.colorPalette?.join(', ') || 'Neutral'}.`;
      } else {
        out += `This project appears to be a ${interpreted.buildingType || 'residential'} building. Key recommendations: 1) Confirm site orientation, 2) Develop area schedule, 3) Produce concept sketch and preliminary BOQ, 4) Engage local suppliers for firm pricing.`;
      }
      return out;
    }

    let localContext = context;
    if (brief) {
      localContext = `Project Brief:\n${JSON.stringify(brief, null, 2)}\n\n${context}`;
    }

    const prompt = `You are the Architect Agent. Your name is Architect Agent. When asked who you are, respond: "I am Architect Agent, an intelligent construction assistant." Never say you are a language model, AI assistant, or mention Google DeepMind, Gemma, or any other company/model name.\n\n${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}User question:\n${question}\n\nProject brief context:\n${brief ? JSON.stringify(brief) : 'No project brief provided yet.'}\n\nLocal reference material:\n${localContext}\n\nExternal context:\n${external}\n\nCRITICAL RULES:\n1. Answer directly and concisely. Do not start with "I am Architect Agent" unless explicitly asked who you are.\n2. Use the provided context above to give specific, actionable advice. If local reference material contains relevant information, cite and use it.\n3. NEVER say "I need more information" as an opening. If details are missing, give general guidance based on standard architectural practice and note what additional details would help refine the answer.\n4. Do not output XML tags, system details, environment information, or markdown code fences.\n5. Do not repeat disclaimers about lacking context. Just answer the question helpfully.\n6. For cost questions, provide realistic estimates in UGX for Uganda if no location is specified, with a clear breakdown.\n7. For design questions, give concrete spatial recommendations, material suggestions, and design rationale.\n8. Keep responses focused and practical. Avoid vague statements like "it depends" without follow-up guidance.`;
    const result = await this.client.generateText(prompt, 700);
    return result.text;
  }

  async interpretBrief(rawBrief: string): Promise<ProjectBrief> {
    if (this.mockMode) return this.mockBrief(rawBrief);
    const context = await this.retriever.retrieveCorpusContext(rawBrief);
    return this.briefInterpreter.interpret(rawBrief, context);
  }

  async createConcept(brief: ProjectBrief): Promise<ConceptDesign> {
    if (this.mockMode) return this.mockConcept();
    const context = await this.retriever.retrieveCorpusContext(brief.projectSummary);
    return this.conceptDesigner.generateConcept(brief, context);
  }

  async planSpace(brief: ProjectBrief): Promise<SpacePlan> {
    if (this.mockMode) return this.mockSpace();
    const context = await this.retriever.retrieveCorpusContext(brief.projectSummary);
    return this.spacePlanner.createSpacePlan(brief, context);
  }

  async generateBOQ(brief: ProjectBrief): Promise<BOQItem[]> {
    if (this.mockMode) return this.mockBOQ();
    const context = await this.retriever.retrieveCorpusContext(brief.projectSummary);
    return this.boqGenerator.generateBOQ(brief, context);
  }

  async estimateCost(brief: ProjectBrief): Promise<CostBreakdown> {
    if (this.mockMode) return this.mockCost();
    const context = await this.retriever.retrieveCorpusContext(brief.projectSummary);
    return this.costEstimator.estimateCost(brief, context);
  }

  async recommendSuppliers(brief: ProjectBrief): Promise<SupplierRecommendation[]> {
    if (this.mockMode) return this.mockSuppliers();
    const context = await this.retriever.retrieveCorpusContext(brief.projectSummary);
    return this.supplierIntelligence.recommendSuppliers(brief, context);
  }

  async adviseStructure(brief: ProjectBrief): Promise<StructuralSuggestion> {
    if (this.mockMode) return this.mockStructure();
    const context = await this.retriever.retrieveCorpusContext(brief.projectSummary);
    return this.structuralAdvisor.suggestStructure(brief, context);
  }

  async generateProjectReport(
    brief: ProjectBrief,
    concept: ConceptDesign,
    spacePlan: SpacePlan,
    boq: BOQItem[],
    cost: CostBreakdown,
    suppliers: SupplierRecommendation[],
    structure: StructuralSuggestion,
  ): Promise<ProjectReport> {
    return this.reportGenerator.generateReport(brief, concept, spacePlan, boq, cost, suppliers, structure);
  }

  async executeWorkflow(rawBrief: string): Promise<string[]> {
    const brief = await this.interpretBrief(rawBrief);
    const [concept, spacePlan, boq, cost, suppliers, structure] = await Promise.all([
      this.createConcept(brief),
      this.planSpace(brief),
      this.generateBOQ(brief),
      this.estimateCost(brief),
      this.recommendSuppliers(brief),
      this.adviseStructure(brief),
    ]);

    const report = await this.generateProjectReport(brief, concept, spacePlan, boq, cost, suppliers, structure);
    return this.fileTool.generateProjectPackage(brief, concept, spacePlan, boq, cost, suppliers, structure, report);
  }
}
