import type { KDocumentStatus, KDocumentType } from '@prisma/client';

export interface K1Data {
  ordinaryIncome: number;
  netRentalIncome: number;
  otherRentalIncome: number;
  guaranteedPayments: number;
  interestIncome: number;
  dividends: number;
  qualifiedDividends: number;
  royalties: number;
  capitalGainLossShortTerm: number;
  capitalGainLossLongTerm: number;
  unrecaptured1250Gain: number;
  section1231GainLoss: number;
  otherIncome: number;
  section179Deduction: number;
  otherDeductions: number;
  selfEmploymentEarnings: number;
  foreignTaxesPaid: number;
  alternativeMinimumTaxItems: number;
  distributionsCash: number;
  distributionsProperty: number;

  // Tax basis tracking fields (optional for backward compatibility)
  beginningTaxBasis?: number;
  endingTaxBasis?: number;
  endingGLBalance?: number;
  k1CapitalAccount?: number;
  otherAdjustments?: number;
  activityNotes?: string;
}

export interface IKDocumentAllocation {
  entityId: string;
  entityName: string;
  ownershipPercent: number;
  allocatedAmounts: Partial<K1Data>;
}

export interface IKDocument {
  id: string;
  partnershipId: string;
  partnershipName?: string;
  type: KDocumentType;
  taxYear: number;
  filingStatus: KDocumentStatus;
  data: K1Data;
  documentFileId?: string;
  allocations?: IKDocumentAllocation[];
  createdAt: string;
  updatedAt: string;
}
