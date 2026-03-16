export interface IFamilyOfficeDashboard {
  totalAum: number;
  currency: string;
  entitiesCount: number;
  partnershipsCount: number;
  allocationByEntity: {
    entityId: string;
    entityName: string;
    value: number;
    percentage: number;
  }[];
  allocationByAssetClass: {
    assetClass: string;
    value: number;
    percentage: number;
  }[];
  allocationByStructure: {
    structureType: string;
    value: number;
    percentage: number;
  }[];
  recentDistributions: {
    id: string;
    partnershipName: string;
    amount: number;
    date: string;
    type: string;
  }[];
  kDocumentStatus: {
    taxYear: number;
    total: number;
    draft: number;
    estimated: number;
    final: number;
  };
}

export interface IFamilyOfficeReport {
  reportTitle: string;
  period: {
    start: string;
    end: string;
  };
  entity?: {
    id: string;
    name: string;
  };
  summary: {
    totalValueStart: number;
    totalValueEnd: number;
    periodChange: number;
    periodChangePercent: number;
    ytdChangePercent: number;
  };
  assetAllocation: Record<string, { value: number; percentage: number }>;
  partnershipPerformance: {
    partnershipId: string;
    partnershipName: string;
    periodReturn: number;
    irr: number;
    tvpi: number;
    dpi: number;
  }[];
  distributionSummary: {
    periodTotal: number;
    byType: Record<string, number>;
  };
  benchmarkComparisons?: {
    excessReturn?: number;
    id: string;
    name: string;
    periodReturn: number;
    ytdReturn?: number;
  }[];
}

export interface IPerformanceMetrics {
  irr: number;
  tvpi: number;
  dpi: number;
  rvpi: number;
}
