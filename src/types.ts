export interface DocumentEntry {
  id: string;
  text: string;
  metadata: Record<string, string> & {
    source?: string;
    path?: string;
    collection?: string;
  };
}

export interface SearchResult {
  doc: DocumentEntry;
  score: number;
}

export interface GenerationResponse {
  text: string;
}

export interface ProjectBrief {
  projectSummary: string;
  buildingType: string;
  bedrooms?: number;
  style: string;
  budget: string;
  plotSize: string;
  climate: string;
  orientation: string;
  sustainabilityRecommendations: string[];
  targetUsers: string[];
  constraints: string[];
}

export interface ConceptDesign {
  conceptStatement: string;
  designPhilosophy: string;
  moodBoard: string[];
  materialRecommendations: string[];
  colorPalette: string[];
  elevationIdeas: string;
  roofRecommendation: string;
  interiorConcept: string;
}

export interface SpacePlan {
  floorPlanSummary: string;
  roomRelationships: string;
  areaSchedule: string;
  circulationStrategy: string;
  layoutRecommendations: string;
  drawing?: {
    plotWidth: number;
    plotHeight: number;
    rooms: Array<{
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    walls: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      thickness: number;
    }>;
    doors: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    }>;
    windows: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    dimensions: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      label: string;
    }>;
  };
}

export interface BOQItem {
  category: string;
  item: string;
  quantity: string;
  unit: string;
  rate?: string;
  amount?: string;
  notes?: string;
}

export interface CostBreakdown {
  totalCost: string;
  labour: string;
  materials: string;
  equipment: string;
  transport: string;
  professionalFees: string;
  contingency: string;
  currency: string;
  assumptions: string;
}

export interface SupplierRecommendation {
  materialCategory: string;
  supplierName: string;
  price: string;
  location: string;
  contact: string;
  availability: string;
  source: string;
  lastUpdated: string;
}

export interface StructuralSuggestion {
  foundation: string;
  slabThickness: string;
  columnSizes: string;
  beamSizes: string;
  roofFraming: string;
  disclaimer: string;
}

export interface ProjectReport {
  title: string;
  summary: string;
  sections: Record<string, string>;
  recommendedExports: string[];
}

export interface ArchitectureSpec {
  projectName: string;
  goals: string;
  siteContext: string;
  deliverables: string[];
}
