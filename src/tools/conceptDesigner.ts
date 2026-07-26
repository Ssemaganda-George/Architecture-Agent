import { GeminiClient } from "../geminiClient.js";
import { ConceptDesign, ProjectBrief } from "../types.js";

export class ConceptDesigner {
  private client: GeminiClient;

  constructor(client: GeminiClient) {
    this.client = client;
  }

  async generateConcept(brief: ProjectBrief, context: string): Promise<ConceptDesign> {
    const prompt = `You are a construction and architecture specialist. Use the brief below to generate a concept design package. Include conceptStatement, designPhilosophy, materialRecommendations, colorPalette, elevationIdeas, roofRecommendation, and interiorConcept.\n\nReturn ONLY valid JSON. Do not wrap it in markdown code fences or include any extra text.\n\nBrief:\n${JSON.stringify(brief, null, 2)}\n\nContext:\n${context}`;
    const response = await this.client.generateText(prompt, 900);
    return this.parseResponse(response.text);
  }

  private parseResponse(text: string): ConceptDesign {
    try {
      const cleaned = this.extractJson(text);
      const parsed = JSON.parse(cleaned);
      return {
        conceptStatement: String(parsed.conceptStatement ?? ""),
        designPhilosophy: String(parsed.designPhilosophy ?? ""),
        moodBoard: [],
        materialRecommendations: Array.isArray(parsed.materialRecommendations)
          ? parsed.materialRecommendations.map(String)
          : [String(parsed.materialRecommendations ?? "")].filter(Boolean),
        colorPalette: Array.isArray(parsed.colorPalette) ? parsed.colorPalette.map(String) : [String(parsed.colorPalette ?? "")].filter(Boolean),
        elevationIdeas: String(parsed.elevationIdeas ?? ""),
        roofRecommendation: String(parsed.roofRecommendation ?? ""),
        interiorConcept: String(parsed.interiorConcept ?? ""),
      };
    } catch {
      return {
        conceptStatement: text.trim(),
        designPhilosophy: "",
        moodBoard: [],
        materialRecommendations: [],
        colorPalette: [],
        elevationIdeas: "",
        roofRecommendation: "",
        interiorConcept: "",
      };
    }
  }

  private extractJson(text: string): string {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced && fenced[1]) {
      return fenced[1].trim();
    }

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return text.substring(start, end + 1).trim();
    }

    return text.trim();
  }
}
