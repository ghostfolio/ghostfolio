import type { DistributionType } from '@prisma/client';

export interface IDistribution {
  id: string;
  partnershipId?: string;
  partnershipName?: string;
  entityId: string;
  entityName?: string;
  type: DistributionType;
  amount: number;
  date: string;
  currency: string;
  taxWithheld?: number;
  netAmount?: number;
  notes?: string;
}

export interface IDistributionSummary {
  totalGross: number;
  totalTaxWithheld: number;
  totalNet: number;
  byType: Record<string, number>;
  byPartnership: Record<string, { name: string; total: number }>;
  byPeriod: Record<string, number>;
}

export interface IDistributionListResponse {
  distributions: IDistribution[];
  summary: IDistributionSummary;
}
