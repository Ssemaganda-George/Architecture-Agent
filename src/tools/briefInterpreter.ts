import { GeminiClient } from "../geminiClient.js";
import { ProjectBrief } from "../types.js";

const DEFAULT_FIELDS = {
  projectSummary: "",
  buildingType: "",
  bedrooms: 0,
  style: "",
  budget: "",
  plotSize: "",
  climate: "",
  orientation: "",
  sustainabilityRecommendations: [],
  targetUsers: [],
  constraints: [],
};

export class BriefInterpreter {
  private client: GeminiClient;

  constructor(client: GeminiClient) {
    this.client = client;
  }

  async interpret(rawBrief: string, context: string): Promise<ProjectBrief> {
    const prompt = `You are an expert construction assistant specialized in architectural design, cost estimation, and local Ugandan construction context.\n\nClient brief:\n${rawBrief}\n\nRelevant context:\n${context}\n\nExtract the following project brief fields in JSON format exactly as shown: projectSummary, buildingType, bedrooms, style, budget, plotSize, climate, orientation, sustainabilityRecommendations, targetUsers, constraints.\n\nReturn ONLY valid JSON. Do not wrap it in markdown code fences or include any extra text.`;
    const response = await this.client.generateText(prompt, 600);
    return this.parseResponse(response.text);
  }

  private parseResponse(text: string): ProjectBrief {
    try {
      const cleaned = this.extractJson(text);
      const result = JSON.parse(cleaned);
      return {
        ...DEFAULT_FIELDS,
        ...result,
        bedrooms: typeof result.bedrooms === "number" ? result.bedrooms : Number(result.bedrooms) || 0,
        sustainabilityRecommendations: Array.isArray(result.sustainabilityRecommendations)
          ? result.sustainabilityRecommendations
          : [String(result.sustainabilityRecommendations ?? "")].filter(Boolean),
        targetUsers: Array.isArray(result.targetUsers) ? result.targetUsers : [String(result.targetUsers ?? "")].filter(Boolean),
        constraints: Array.isArray(result.constraints) ? result.constraints : [String(result.constraints ?? "")].filter(Boolean),
      };
    } catch {
      return {
        ...DEFAULT_FIELDS,
        projectSummary: text.trim(),
        buildingType: "Unknown",
        style: "Contemporary",
        budget: "Unknown",
        plotSize: "Unknown",
        climate: "Unknown",
        orientation: "Unknown",
        sustainabilityRecommendations: [],
        targetUsers: [],
        constraints: [],
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
