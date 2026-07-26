import { GeminiClient } from "../geminiClient.js";
import { BOQItem, ProjectBrief } from "../types.js";

export class BOQGenerator {
  private client: GeminiClient;

  constructor(client: GeminiClient) {
    this.client = client;
  }

  async generateBOQ(brief: ProjectBrief, context: string): Promise<BOQItem[]> {
    const prompt = `You are a quantity surveying specialist. Create a Bill of Quantities suitable for the building type in the brief (residential, commercial, industrial, institutional, etc.). Include relevant categories and items.\n\nUse ONLY Ugandan Shillings (UGX) for all rates and amounts. Use realistic 2024-2025 Ugandan market rates.\n\nProvide the response as valid JSON array items with category, item, quantity, unit, rate, amount, and optional notes.\n\nReturn ONLY valid JSON. Do not wrap it in markdown code fences or include any extra text.\n\nBrief:\n${JSON.stringify(brief, null, 2)}\n\nContext:\n${context}`;
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
        if (typeof v === "object") return JSON.stringify(v);
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
      
      const partialItems = this.extractObjectsFromArray(cleaned);
      if (partialItems.length > 0) {
        return partialItems;
      }

      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        let jsonStr = arrayMatch[0];
        jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed)) {
            const asString = (v: any) => {
              if (v === undefined || v === null) return "";
              if (typeof v === "object") return JSON.stringify(v);
              return String(v);
            };
            return parsed.map((item: any) => ({
              category: asString(item.category),
              item: asString(item.item),
              quantity: asString(item.quantity),
              unit: asString(item.unit),
              rate: item.rate != null ? asString(item.rate) : undefined,
              amount: item.amount != null ? asString(item.amount) : undefined,
              notes: item.notes != null ? asString(item.notes) : undefined,
            }));
          }
        } catch {
          // fall through to fallback
        }
      }
      return [{
        category: "General",
        item: cleaned.length > 50000 ? cleaned.slice(0, 50000) + "..." : cleaned,
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
      let depth = 0;
      let actualEnd = end;
      for (let i = start; i <= end; i++) {
        if (text[i] === "[") depth++;
        else if (text[i] === "]") {
          depth--;
          if (depth === 0) {
            actualEnd = i;
            break;
          }
        }
      }
      return text.substring(start, actualEnd + 1).trim();
    }

    return text.trim();
  }
}
