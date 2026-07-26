import { GeminiClient } from "../geminiClient.js";
import { ProjectBrief, SupplierRecommendation } from "../types.js";

export class SupplierIntelligence {
  private client: GeminiClient;

  constructor(client: GeminiClient) {
    this.client = client;
  }

  async recommendSuppliers(brief: ProjectBrief, context: string): Promise<SupplierRecommendation[]> {
    const prompt = `You are a procurement and supplier analyst. Recommend suppliers for materials appropriate to this ${brief.buildingType || 'construction'} project based on the project brief and local Ugandan construction market. Return a JSON array with materialCategory, supplierName, price, location, contact, availability, source, and lastUpdated.\n\nReturn ONLY valid JSON. Do not wrap it in markdown code fences or include any extra text.\n\nBrief:\n${JSON.stringify(brief, null, 2)}\n\nContext:\n${context}`;
    const response = await this.client.generateText(prompt, 900);
    return this.parseResponse(response.text);
  }

  private parseResponse(text: string): SupplierRecommendation[] {
    try {
      const cleaned = this.extractJson(text);
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        throw new Error("Supplier response is not an array");
      }
      return parsed.map((item: any) => ({
        materialCategory: String(item.materialCategory ?? ""),
        supplierName: String(item.supplierName ?? ""),
        price: String(item.price ?? ""),
        location: String(item.location ?? ""),
        contact: String(item.contact ?? ""),
        availability: String(item.availability ?? ""),
        source: String(item.source ?? ""),
        lastUpdated: String(item.lastUpdated ?? ""),
      }));
    } catch {
      return [{
        materialCategory: "General",
        supplierName: "No supplier data available",
        price: "",
        location: "",
        contact: "",
        availability: "",
        source: "",
        lastUpdated: "",
      }];
    }
  }

  private extractJson(text: string): string {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced && fenced[1]) {
      return fenced[1].trim();
    }

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      return text.substring(start, end + 1).trim();
    }

    return text.trim();
  }
}
