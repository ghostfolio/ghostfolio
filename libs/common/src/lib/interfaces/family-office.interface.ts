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

// --- Portfolio Performance Views interfaces ---

export interface IPerformanceRow {
  originalCommitment: number;
  percentCalled: number | null;
  unfundedCommitment: number;
  paidIn: number;
  distributions: number;
  residualUsed: number;
  dpi: number;
  rvpi: number;
  tvpi: number;
  irr: number | null;
}

export interface IEntityPerformanceRow extends IPerformanceRow {
  entityId: string;
  entityName: string;
}

export interface IPortfolioSummary {
  entities: IEntityPerformanceRow[];
  quarter?: number;
  totals: IPerformanceRow;
  valuationYear: number;
}

export interface IAssetClassPerformanceRow extends IPerformanceRow {
  assetClass: string;
  assetClassLabel: string;
}

export interface IAssetClassSummary {
  assetClasses: IAssetClassPerformanceRow[];
  quarter?: number;
  totals: IPerformanceRow;
  valuationYear: number;
}

export interface IActivityRow {
  year: number;
  entityId: string;
  entityName: string;
  partnershipId: string;
  partnershipName: string;

  // Basis & Contributions
  beginningBasis: number;
  contributions: number;

  // Income Components (from K1Data)
  interest: number;
  dividends: number;
  capitalGains: number;
  remainingK1IncomeDed: number;
  totalIncome: number;

  // Outflows
  distributions: number;
  otherAdjustments: number;

  // Balances
  endingTaxBasis: number;
  endingGLBalance: number | null;
  bookToTaxAdj: number | null;
  endingK1CapitalAccount: number | null;
  k1CapitalVsTaxBasisDiff: number | null;

  // Flags
  excessDistribution: number;
  negativeBasis: boolean;
  deltaEndingBasis: number;

  // Metadata
  notes: string | null;
}

export interface IActivityDetail {
  rows: IActivityRow[];
  totalCount: number;
  filters: {
    entities: { id: string; name: string }[];
    partnerships: { id: string; name: string }[];
    years: number[];
  };
}
