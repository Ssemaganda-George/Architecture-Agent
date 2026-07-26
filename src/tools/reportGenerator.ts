import { ProjectBrief, ConceptDesign, SpacePlan, BOQItem, CostBreakdown, SupplierRecommendation, StructuralSuggestion, ProjectReport } from "../types.js";

export class ReportGenerator {
  generateReport(
    brief: ProjectBrief,
    concept: ConceptDesign,
    spacePlan: SpacePlan,
    boq: BOQItem[],
    cost: CostBreakdown,
    suppliers: SupplierRecommendation[],
    structure: StructuralSuggestion,
  ): ProjectReport {
    const sections: Record<string, string> = {
      "Project Summary": brief.projectSummary,
      "Concept Statement": concept.conceptStatement,
      "Design Philosophy": concept.designPhilosophy,
      "Space Planning": `${spacePlan.floorPlanSummary}\n\nRoom relationships:\n${spacePlan.roomRelationships}\n\nCirculation:\n${spacePlan.circulationStrategy}`,
      "BOQ Overview": boq
        .map((item) => `- ${item.category}: ${item.item} ${item.quantity} ${item.unit}${item.amount ? ` @ ${item.amount}` : ""}`)
        .join("\n"),
      "Cost Estimate": `Total: ${cost.totalCost} ${cost.currency}\nLabour: ${cost.labour}\nMaterials: ${cost.materials}\nEquipment: ${cost.equipment}\nTransport: ${cost.transport}\nProfessional fees: ${cost.professionalFees}\nContingency: ${cost.contingency}\nAssumptions: ${cost.assumptions}`,
      "Supplier Recommendations": suppliers
        .map((supplier) => `- ${supplier.materialCategory}: ${supplier.supplierName} | ${supplier.price} | ${supplier.location} | ${supplier.availability}`)
        .join("\n"),
      "Structural Suggestions": `${structure.foundation}\n${structure.slabThickness}\n${structure.columnSizes}\n${structure.beamSizes}\n${structure.roofFraming}\n\n${structure.disclaimer}`,
    };

    return {
      title: `Project Report - ${brief.projectSummary}`,
      summary: `A generated architecture and construction intelligence report for ${brief.buildingType} projects.`,
      sections,
      recommendedExports: ["PDF", "Word", "Excel", "CSV", "IFC-ready data"],
    };
  }
}
