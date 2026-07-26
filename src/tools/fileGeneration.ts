import fs from "fs/promises";
import path from "path";
import { ProjectBrief, ConceptDesign, SpacePlan, BOQItem, CostBreakdown, SupplierRecommendation, StructuralSuggestion, ProjectReport } from "../types.js";

export class FileGenerationTool {
  async generateProjectPackage(
    brief: ProjectBrief,
    concept: ConceptDesign,
    spacePlan: SpacePlan,
    boq: BOQItem[],
    cost: CostBreakdown,
    suppliers: SupplierRecommendation[],
    structure: StructuralSuggestion,
    report: ProjectReport,
  ): Promise<string[]> {
    const outputDir = path.resolve("output", brief.projectSummary.replace(/[^a-zA-Z0-9-_]/g, "_"));
    await fs.mkdir(outputDir, { recursive: true });

    const reportPath = path.join(outputDir, "project-report.md");
    const conceptPath = path.join(outputDir, "concept-design.md");
    const spacePlanPath = path.join(outputDir, "space-plan.md");
    const boqJsonPath = path.join(outputDir, "boq.json");
    const boqCsvPath = path.join(outputDir, "boq.csv");
    const costPath = path.join(outputDir, "cost-estimate.md");
    const suppliersPath = path.join(outputDir, "supplier-recommendations.md");
    const structurePath = path.join(outputDir, "structural-suggestions.md");
    const reportJsonPath = path.join(outputDir, "report.json");

    const reportMarkdown = this.buildReportMarkdown(report, brief, concept, spacePlan, boq, cost, suppliers, structure);
    const conceptMarkdown = this.buildConceptMarkdown(concept);
    const spacePlanMarkdown = this.buildSpacePlanMarkdown(spacePlan);
    const costMarkdown = this.buildCostMarkdown(cost);
    const suppliersMarkdown = this.buildSuppliersMarkdown(suppliers);
    const structureMarkdown = this.buildStructureMarkdown(structure);

    await Promise.all([
      fs.writeFile(reportPath, reportMarkdown, "utf-8"),
      fs.writeFile(conceptPath, conceptMarkdown, "utf-8"),
      fs.writeFile(spacePlanPath, spacePlanMarkdown, "utf-8"),
      fs.writeFile(boqJsonPath, JSON.stringify(boq, null, 2), "utf-8"),
      fs.writeFile(boqCsvPath, this.convertBOQToCsv(boq), "utf-8"),
      fs.writeFile(costPath, costMarkdown, "utf-8"),
      fs.writeFile(suppliersPath, suppliersMarkdown, "utf-8"),
      fs.writeFile(structurePath, structureMarkdown, "utf-8"),
      fs.writeFile(reportJsonPath, JSON.stringify(report, null, 2), "utf-8"),
    ]);

    return [
      reportPath,
      conceptPath,
      spacePlanPath,
      boqJsonPath,
      boqCsvPath,
      costPath,
      suppliersPath,
      structurePath,
      reportJsonPath,
    ];
  }

  private buildReportMarkdown(
    report: ProjectReport,
    brief: ProjectBrief,
    concept: ConceptDesign,
    spacePlan: SpacePlan,
    boq: BOQItem[],
    cost: CostBreakdown,
    suppliers: SupplierRecommendation[],
    structure: StructuralSuggestion,
  ): string {
    const sectionContent = Object.entries(report.sections)
      .map(([title, body]) => `## ${title}\n\n${body}`)
      .join("\n\n");

    return `# ${report.title}

${report.summary}

## Project Details
- Building type: ${brief.buildingType}
- Budget: ${brief.budget}
- Plot: ${brief.plotSize}
- Climate: ${brief.climate}
- Orientation: ${brief.orientation}

${sectionContent}

## Recommended exports
${report.recommendedExports.map((item) => `- ${item}`).join("\n")}
`;
  }

  private buildConceptMarkdown(concept: ConceptDesign): string {
    return `# Concept Design\n\n## Concept Statement\n${concept.conceptStatement}\n\n## Design Philosophy\n${concept.designPhilosophy}\n\n## Mood Board\n${concept.moodBoard.map((item) => `- ${item}`).join("\n")}\n\n## Materials\n${concept.materialRecommendations.map((item) => `- ${item}`).join("\n")}\n\n## Color Palette\n${concept.colorPalette.map((item) => `- ${item}`).join("\n")}\n\n## Elevation Ideas\n${concept.elevationIdeas}\n\n## Roof Recommendation\n${concept.roofRecommendation}\n\n## Interior Concept\n${concept.interiorConcept}\n`;
  }

  private buildSpacePlanMarkdown(spacePlan: SpacePlan): string {
    return `# Space Plan\n\n## Floor Plan Summary\n${spacePlan.floorPlanSummary}\n\n## Room Relationships\n${spacePlan.roomRelationships}\n\n## Area Schedule\n${spacePlan.areaSchedule}\n\n## Circulation Strategy\n${spacePlan.circulationStrategy}\n\n## Layout Recommendations\n${spacePlan.layoutRecommendations}\n`;
  }

  private buildCostMarkdown(cost: CostBreakdown): string {
    return `# Cost Estimate\n\n- Total cost: ${cost.totalCost} ${cost.currency}\n- Labour: ${cost.labour}\n- Materials: ${cost.materials}\n- Equipment: ${cost.equipment}\n- Transport: ${cost.transport}\n- Professional fees: ${cost.professionalFees}\n- Contingency: ${cost.contingency}\n\n## Assumptions\n${cost.assumptions}\n`;
  }

  private buildSuppliersMarkdown(suppliers: SupplierRecommendation[]): string {
    return `# Supplier Recommendations\n\n${suppliers
      .map(
        (supplier) =>
          `- **${supplier.materialCategory}**: ${supplier.supplierName} | ${supplier.price} | ${supplier.location} | ${supplier.contact} | Availability: ${supplier.availability} | Source: ${supplier.source} | Updated: ${supplier.lastUpdated}`,
      )
      .join("\n")}
`;
  }

  private buildStructureMarkdown(structure: StructuralSuggestion): string {
    return `# Structural Suggestions\n\n- Foundation: ${structure.foundation}\n- Slab thickness: ${structure.slabThickness}\n- Column sizes: ${structure.columnSizes}\n- Beam sizes: ${structure.beamSizes}\n- Roof framing: ${structure.roofFraming}\n\n${structure.disclaimer}\n`;
  }

  private convertBOQToCsv(boq: BOQItem[]): string {
    const header = ["category", "item", "quantity", "unit", "rate", "amount", "notes"];
    const rows = boq.map((item) =>
      [item.category, item.item, item.quantity, item.unit, item.rate ?? "", item.amount ?? "", item.notes ?? ""]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    return [header.join(","), ...rows].join("\n");
  }
}
