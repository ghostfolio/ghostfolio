import type {
  FamilyOfficeAssetType,
  PartnershipType,
  ValuationSource
} from '@prisma/client';

export interface IPartnership {
  id: string;
  name: string;
  type: PartnershipType;
  inceptionDate: string;
  fiscalYearEnd: number;
  currency: string;
  latestNav?: number;
  latestNavDate?: string;
  membersCount?: number;
  assetsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface IPartnershipMembership {
  id: string;
  entityId: string;
  entityName?: string;
  ownershipPercent: number;
  capitalCommitment?: number;
  capitalContributed?: number;
  classType?: string;
  allocatedNav?: number;
  effectiveDate: string;
  endDate?: string;
}

export interface IPartnershipAsset {
  id: string;
  name: string;
  assetType: FamilyOfficeAssetType;
  description?: string;
  acquisitionDate?: string;
  acquisitionCost?: number;
  currentValue?: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface IPartnershipValuation {
  id: string;
  date: string;
  nav: number;
  source: ValuationSource;
  notes?: string;
}

export interface IPartnershipDetail extends IPartnership {
  latestValuation?: IPartnershipValuation;
  members: IPartnershipMembership[];
  assets: IPartnershipAsset[];
  totalCommitment: number;
  totalContributed: number;
}

export interface IPartnershipPerformance {
  partnershipId: string;
  partnershipName: string;
  metrics: {
    irr: number;
    tvpi: number;
    dpi: number;
    rvpi: number;
  };
  periods: {
    periodStart: string;
    periodEnd: string;
    returnPercent: number;
    startNav: number;
    endNav: number;
    contributions: number;
    distributions: number;
  }[];
  benchmarkComparisons?: {
    id: string;
    name: string;
    periods: {
      periodStart: string;
      periodEnd: string;
      returnPercent: number;
    }[];
    cumulativeReturn: number;
    excessReturn: number;
  }[];
}
