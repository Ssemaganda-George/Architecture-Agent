import { GeminiClient } from "../geminiClient.js";
import { ProjectBrief, SpacePlan } from "../types.js";

export class SpacePlanner {
  private client: GeminiClient;

  constructor(client: GeminiClient) {
    this.client = client;
  }

  async createSpacePlan(brief: ProjectBrief, context: string): Promise<SpacePlan> {
    const prompt = `You are a planning specialist. Create an architectural space plan suitable for the building type in the brief (residential, commercial, industrial, institutional, etc.). Provide floorPlanSummary, roomRelationships, areaSchedule, circulationStrategy, layoutRecommendations, and drawing.\n\nThe drawing object must contain:\n- plotWidth and plotHeight in meters\n- rooms: array of objects with name, x, y, width, height (all in meters)\n- walls: array of line segments with x1, y1, x2, y2, thickness\n- doors: array with x, y, width, height, rotation\n- windows: array with x, y, width, height\n- dimensions: array with x1, y1, x2, y2, label\n\nReturn ONLY valid JSON. Do not wrap it in markdown code fences or include any extra text.\n\nBrief:\n${JSON.stringify(brief, null, 2)}\n\nContext:\n${context}`;
    const response = await this.client.generateText(prompt, 2000);
    return this.parseResponse(response.text);
  }

  private parseResponse(text: string): SpacePlan {
    try {
      const cleaned = this.extractJson(text);
      const parsed = JSON.parse(cleaned);
      const stringify = (v: any) => {
        if (v === undefined || v === null) return "";
        if (typeof v === "object") return JSON.stringify(v);
        return String(v);
      };
      const drawing = parsed.drawing && typeof parsed.drawing === "object" ? parsed.drawing : undefined;
      return {
        floorPlanSummary: stringify(parsed.floorPlanSummary),
        roomRelationships: stringify(parsed.roomRelationships),
        areaSchedule: stringify(parsed.areaSchedule),
        circulationStrategy: stringify(parsed.circulationStrategy),
        layoutRecommendations: stringify(parsed.layoutRecommendations),
        drawing,
      };
    } catch {
      return {
        floorPlanSummary: text.trim(),
        roomRelationships: "",
        areaSchedule: "",
        circulationStrategy: "",
        layoutRecommendations: "",
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
