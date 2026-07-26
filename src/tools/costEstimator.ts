import { GeminiClient } from "../geminiClient.js";
import { CostBreakdown, ProjectBrief } from "../types.js";

export class CostEstimator {
  private client: GeminiClient;

  constructor(client: GeminiClient) {
    this.client = client;
  }

  async estimateCost(brief: ProjectBrief, context: string): Promise<CostBreakdown> {
    const prompt = `You are an expert construction cost estimator specializing in Ugandan construction. Using the brief below, estimate total cost in UGX.\n\nCRITICAL: Return ONLY a flat JSON object with these EXACT top-level fields and NOTHING ELSE:\n{\n  "totalCost": 123456789,\n  "currency": "UGX",\n  "labour": 12345678,\n  "materials": 12345678,\n  "equipment": 1234567,\n  "transport": 1234567,\n  "professionalFees": 1234567,\n  "contingency": 1234567,\n  "assumptions": "Short summary of key assumptions."\n}\n\nRULES:\n- Do NOT nest labour, materials, equipment, transport, professionalFees, or contingency under another object.\n- Do NOT include any other fields.\n- Do NOT wrap in markdown code fences.\n- All values must be numbers except assumptions which is a string.\n- totalCost must equal the sum of all other numeric fields.\n\nBrief:\n${JSON.stringify(brief, null, 2)}\n\nContext:\n${context}`;
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
      
      const anyParsed = parsed as any;
      let totalCost = anyParsed.totalCost;
      let currency = anyParsed.currency;
      let labour = anyParsed.labour;
      let materials = anyParsed.materials;
      let equipment = anyParsed.equipment;
      let transport = anyParsed.transport;
      let professionalFees = anyParsed.professionalFees;
      let contingency = anyParsed.contingency;
      let assumptions = anyParsed.assumptions;

      if (!totalCost && anyParsed.cost_breakdown) {
        const cb = anyParsed.cost_breakdown;
        labour = cb.labour?.cost ?? cb.labour;
        materials = cb.materials?.cost ?? cb.materials;
        equipment = cb.equipment?.cost ?? cb.equipment;
        transport = cb.transport?.cost ?? cb.transport;
        professionalFees = cb.professional_fees?.cost ?? cb.professionalFees;
        contingency = cb.contingency?.cost ?? cb.contingency;
        totalCost = anyParsed.total_cost ?? anyParsed.totalCost ?? "";
        currency = anyParsed.currency ?? "UGX";
        assumptions = anyParsed.assumptions ?? "";
      }

      const asString = (v: any) => {
        if (v === undefined || v === null) return "";
        return String(v);
      };
      
      if (typeof labour === "object" && labour !== null) {
        const labourObj = labour as any;
        const cost = labourObj.cost;
        const skilled = labourObj.skilled;
        const unskilled = labourObj.unskilled;
        if (cost !== undefined && cost !== null) {
          labour = cost;
        } else if (skilled !== undefined && unskilled !== undefined) {
          labour = skilled + unskilled;
        } else {
          const values = Object.values(labourObj).filter((v: any) => typeof v === "number");
          labour = values.length > 0 ? values.reduce((a: number, b: any) => a + b, 0) : labour;
        }
      }
      if (typeof materials === "object" && materials !== null) {
        const materialsObj = materials as any;
        const cost = materialsObj.cost;
        if (cost !== undefined && cost !== null) {
          materials = cost;
        } else {
          const values = Object.values(materialsObj).filter((v: any) => typeof v === "number");
          materials = values.length > 0 ? values.reduce((a: number, b: any) => a + b, 0) : materials;
        }
      }
      if (typeof equipment === "object" && equipment !== null) {
        const equipmentObj = equipment as any;
        const cost = equipmentObj.cost;
        if (cost !== undefined && cost !== null) {
          equipment = cost;
        } else {
          const values = Object.values(equipmentObj).filter((v: any) => typeof v === "number");
          equipment = values.length > 0 ? values.reduce((a: number, b: any) => a + b, 0) : equipment;
        }
      }
      if (typeof transport === "object" && transport !== null) {
        const transportObj = transport as any;
        const cost = transportObj.cost;
        if (cost !== undefined && cost !== null) {
          transport = cost;
        } else {
          const values = Object.values(transportObj).filter((v: any) => typeof v === "number");
          transport = values.length > 0 ? values.reduce((a: number, b: any) => a + b, 0) : transport;
        }
      }
      if (typeof professionalFees === "object" && professionalFees !== null) {
        const professionalFeesObj = professionalFees as any;
        const cost = professionalFeesObj.cost;
        if (cost !== undefined && cost !== null) {
          professionalFees = cost;
        } else {
          const values = Object.values(professionalFeesObj).filter((v: any) => typeof v === "number");
          professionalFees = values.length > 0 ? values.reduce((a: number, b: any) => a + b, 0) : professionalFees;
        }
      }
      if (typeof contingency === "object" && contingency !== null) {
        const contingencyObj = contingency as any;
        const cost = contingencyObj.cost;
        if (cost !== undefined && cost !== null) {
          contingency = cost;
        } else {
          const values = Object.values(contingencyObj).filter((v: any) => typeof v === "number");
          contingency = values.length > 0 ? values.reduce((a: number, b: any) => a + b, 0) : contingency;
        }
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
