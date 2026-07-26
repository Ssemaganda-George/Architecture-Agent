import { GeminiClient } from "../geminiClient.js";
import { ProjectBrief, StructuralSuggestion } from "../types.js";

export class StructuralAdvisor {
  private client: GeminiClient;

  constructor(client: GeminiClient) {
    this.client = client;
  }

  async suggestStructure(brief: ProjectBrief, context: string): Promise<StructuralSuggestion> {
    const prompt = `You are a structural design advisor. Provide preliminary structural recommendations for a ${brief.buildingType || 'building'} project. Include foundation type, slab thickness, column sizes, beam sizes, and roof framing. Include a clear licensed engineer disclaimer.\n\nReturn ONLY valid JSON. Do not wrap it in markdown code fences or include any extra text.\n\nBrief:\n${JSON.stringify(brief, null, 2)}\n\nContext:\n${context}`;
    const response = await this.client.generateText(prompt, 700);
    return this.parseResponse(response.text);
  }

  private parseResponse(text: string): StructuralSuggestion {
    try {
      const cleaned = this.extractJson(text);
      const parsed = JSON.parse(cleaned);
      return {
        foundation: String(parsed.foundation ?? ""),
        slabThickness: String(parsed.slabThickness ?? ""),
        columnSizes: String(parsed.columnSizes ?? ""),
        beamSizes: String(parsed.beamSizes ?? ""),
        roofFraming: String(parsed.roofFraming ?? ""),
        disclaimer: String(parsed.disclaimer ?? ""),
      };
    } catch {
      return {
        foundation: text.trim(),
        slabThickness: "",
        columnSizes: "",
        beamSizes: "",
        roofFraming: "",
        disclaimer: "These are preliminary recommendations and should be reviewed by a licensed structural engineer.",
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
