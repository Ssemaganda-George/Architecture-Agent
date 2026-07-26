import { GeminiClient } from "../geminiClient.js";
import { BOQItem, ProjectBrief } from "../types.js";

export class BOQGenerator {
  private client: GeminiClient;

  constructor(client: GeminiClient) {
    this.client = client;
  }

  async generateBOQ(brief: ProjectBrief, context: string): Promise<BOQItem[]> {
    const prompt = `You are a quantity surveying specialist specializing in Ugandan construction. Create a Bill of Quantities for the project brief below with categories Excavation, Concrete, Masonry, Roofing, Finishes, Plumbing, Electrical, Painting.\n\nUse ONLY Ugandan Shillings (UGX) for all rates and amounts. Use realistic 2024-2025 Ugandan market rates:\n- Excavation: 15,000-25,000 UGX per m³\n- Concrete (ready mix): 120,000-180,000 UGX per m³\n- Common bricks: 800-1,200 UGX each\n- Cement blocks: 1,500-2,500 UGX each\n- Roofing iron sheets: 25,000-40,000 UGX per m²\n- Plastering: 8,000-15,000 UGX per m²\n- Floor tiles: 15,000-30,000 UGX per m²\n- PVC water pipes: 8,000-12,000 UGX per metre\n- Electrical wiring: 5,000-10,000 UGX per metre\n- Painting: 10,000-18,000 UGX per m²\n\nProvide the response as valid JSON array items with category, item, quantity, unit, rate, amount, and optional notes.\n\nReturn ONLY valid JSON. Do not wrap it in markdown code fences or include any extra text.\n\nBrief:\n${JSON.stringify(brief, null, 2)}\n\nContext:\n${context}`;
    const response = await this.client.generateText(prompt, 2000);
    return this.parseResponse(response.text);
  }

  private parseResponse(text: string): BOQItem[] {
    try {
      const cleaned = this.extractJson(text);
      const parsed = JSON.parse(cleaned);
      let items: any[] = [];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
        items = parsed.items;
      } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.boq)) {
        items = parsed.boq;
      } else {
        throw new Error("BOQ response is not an array");
      }
      const asString = (v: any) => {
        if (v === undefined || v === null) return "";
        if (typeof v === "number") return String(v);
        return String(v);
      };
      return items.map((item: any) => ({
        category: asString(item.category),
        item: asString(item.item),
        quantity: asString(item.quantity),
        unit: asString(item.unit),
        rate: item.rate != null ? asString(item.rate) : undefined,
        amount: item.amount != null ? asString(item.amount) : undefined,
        notes: item.notes != null ? asString(item.notes) : undefined,
      }));
    } catch {
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      if (cleaned.startsWith("[") && !cleaned.endsWith("]")) {
        try {
          const partialItems = this.extractObjectsFromArray(cleaned);
          if (partialItems.length > 0) {
            return partialItems;
          }
        } catch {
          // fall through to fallback
        }
      }

      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        let jsonStr = arrayMatch[0];
        jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed)) {
            return parsed.map((item: any) => ({
              category: String(item.category ?? ""),
              item: String(item.item ?? ""),
              quantity: String(item.quantity ?? ""),
              unit: String(item.unit ?? ""),
              rate: item.rate != null ? String(item.rate) : undefined,
              amount: item.amount != null ? String(item.amount) : undefined,
              notes: item.notes != null ? String(item.notes) : undefined,
            }));
          }
        } catch {
          // fall through to fallback
        }
      }
      return [{
        category: "General",
        item: cleaned.length > 500 ? cleaned.slice(0, 500) + "..." : cleaned,
        quantity: "",
        unit: "",
      }];
    }
  }

  private extractObjectsFromArray(text: string): BOQItem[] {
    const items: BOQItem[] = [];
    const regex = /\{\s*"category"\s*:\s*"([^"]+)"\s*,\s*"item"\s*:\s*"([^"]+)"\s*,\s*"quantity"\s*:\s*([^,]+)\s*,\s*"unit"\s*:\s*"([^"]+)"\s*,\s*"rate"\s*:\s*([^,]+)\s*,\s*"amount"\s*:\s*([^,\}]+)\s*\}\s*,?/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      items.push({
        category: match[1],
        item: match[2],
        quantity: match[3].trim(),
        unit: match[4],
        rate: match[5].trim(),
        amount: match[6].trim(),
      });
    }
    return items;
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
