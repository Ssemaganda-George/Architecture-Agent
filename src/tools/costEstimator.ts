import { GeminiClient } from "../geminiClient.js";
import { CostBreakdown, ProjectBrief } from "../types.js";

export class CostEstimator {
  private client: GeminiClient;

  constructor(client: GeminiClient) {
    this.client = client;
  }

  async estimateCost(brief: ProjectBrief, context: string): Promise<CostBreakdown> {
    const prompt = `You are an expert construction cost estimator specializing in Ugandan construction. Using the brief below and local Ugandan construction context, estimate total cost in Ugandan Shillings (UGX) for this ${brief.buildingType || 'construction'} project. Provide a realistic cost breakdown.\n\nReturn ONLY valid JSON with these exact top-level fields: totalCost, currency, labour, materials, equipment, transport, professionalFees, contingency, assumptions. Do not nest these under another object. Do not wrap it in markdown code fences or include any extra text.\n\nAll monetary values must be in UGX. Use realistic Ugandan market rates appropriate for the building type.\n\nBrief:\n${JSON.stringify(brief, null, 2)}\n\nContext:\n${context}`;
    const response = await this.client.generateText(prompt, 900);
    return this.parseResponse(response.text);
  }

  private parseResponse(text: string): CostBreakdown {
    try {
      const cleaned = this.extractJson(text);
      const parsed = JSON.parse(cleaned);
      const asString = (v: any) => {
        if (v === undefined || v === null) return "";
        return String(v);
      };
      let totalCost = parsed.totalCost;
      let currency = parsed.currency;
      let labour = parsed.labour;
      let materials = parsed.materials;
      let equipment = parsed.equipment;
      let transport = parsed.transport;
      let professionalFees = parsed.professionalFees;
      let contingency = parsed.contingency;
      let assumptions = parsed.assumptions;

      if (!totalCost && parsed.cost_breakdown) {
        const cb = parsed.cost_breakdown;
        labour = cb.labour?.cost ?? cb.labour;
        materials = cb.materials?.cost ?? cb.materials;
        equipment = cb.equipment?.cost ?? cb.equipment;
        transport = cb.transport?.cost ?? cb.transport;
        professionalFees = cb.professional_fees?.cost ?? cb.professionalFees;
        contingency = cb.contingency?.cost ?? cb.contingency;
        totalCost = parsed.total_cost ?? parsed.totalCost ?? "";
        currency = parsed.currency ?? "UGX";
        assumptions = parsed.assumptions ?? "";
      }

      return {
        totalCost: asString(totalCost),
        labour: asString(labour),
        materials: asString(materials),
        equipment: asString(equipment),
        transport: asString(transport),
        professionalFees: asString(professionalFees),
        contingency: asString(contingency),
        currency: asString(currency),
        assumptions: asString(assumptions),
      };
    } catch {
      return {
        totalCost: text.trim(),
        labour: "",
        materials: "",
        equipment: "",
        transport: "",
        professionalFees: "",
        contingency: "",
        currency: "UGX",
        assumptions: "",
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
