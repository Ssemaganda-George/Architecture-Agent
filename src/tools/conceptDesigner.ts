import { GeminiClient } from "../geminiClient.js";
import { ConceptDesign, ProjectBrief } from "../types.js";

export class ConceptDesigner {
  private client: GeminiClient;

  constructor(client: GeminiClient) {
    this.client = client;
  }

  async generateConcept(brief: ProjectBrief, context: string): Promise<ConceptDesign> {
    const prompt = `You are a construction and architecture specialist. Use the brief below to generate a concept design package suitable for the building type (residential, commercial, industrial, institutional, etc.).\n\nCRITICAL JSON RULES:\n- Return ONLY a flat JSON object with these exact top-level fields: conceptStatement, designPhilosophy, materialRecommendations, colorPalette, elevationIdeas, roofRecommendation, interiorConcept\n- Do NOT nest these fields inside another object\n- Do NOT wrap fields inside markdown code fences\n- materialRecommendations and colorPalette must be arrays of strings\n- All other fields must be strings\n\nBrief:\n${JSON.stringify(brief, null, 2)}\n\nContext:\n${context}`;
    const response = await this.client.generateText(prompt, 900);
    return this.parseResponse(response.text);
  }

  private parseResponse(text: string): ConceptDesign {
    try {
      const cleaned = this.extractJson(text);
      const parsed = JSON.parse(cleaned);
      
      let source = parsed;
      if (parsed.conceptStatement && typeof parsed.conceptStatement === "object") {
        source = parsed.conceptStatement;
      }
      if (parsed.conceptDesign && typeof parsed.conceptDesign === "object") {
        source = { ...source, ...parsed.conceptDesign };
      }
      
      const asString = (v: any) => {
        if (v === undefined || v === null) return "";
        if (typeof v === "object") return JSON.stringify(v);
        return String(v);
      };
      return {
        conceptStatement: asString(source.conceptStatement ?? parsed.conceptStatement),
        designPhilosophy: asString(source.designPhilosophy ?? parsed.designPhilosophy),
        moodBoard: [],
        materialRecommendations: Array.isArray(source.materialRecommendations)
          ? source.materialRecommendations.map(asString)
          : Array.isArray(parsed.materialRecommendations)
            ? parsed.materialRecommendations.map(asString)
            : [asString(source.materialRecommendations ?? parsed.materialRecommendations)].filter(Boolean),
        colorPalette: Array.isArray(source.colorPalette)
          ? source.colorPalette.map(asString)
          : Array.isArray(parsed.colorPalette)
            ? parsed.colorPalette.map(asString)
            : [asString(source.colorPalette ?? parsed.colorPalette)].filter(Boolean),
        elevationIdeas: asString(source.elevationIdeas ?? parsed.elevationIdeas),
        roofRecommendation: asString(source.roofRecommendation ?? parsed.roofRecommendation),
        interiorConcept: asString(source.interiorConcept ?? parsed.interiorConcept),
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
