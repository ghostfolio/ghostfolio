import type { EntityType } from '@prisma/client';

export interface IEntity {
  id: string;
  name: string;
  type: EntityType;
  taxId?: string;
  totalValue?: number;
  ownershipsCount?: number;
  membershipsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface IOwnership {
  id: string;
  accountId: string;
  accountName?: string;
  ownershipPercent: number;
  effectiveDate: string;
  endDate?: string;
  acquisitionDate?: string;
  costBasis?: number;
  allocatedValue?: number;
}

export interface IEntityMembership {
  id: string;
  partnershipId: string;
  partnershipName?: string;
  ownershipPercent: number;
  capitalCommitment?: number;
  capitalContributed?: number;
  classType?: string;
  allocatedNav?: number;
}

export interface IEntityWithRelations extends IEntity {
  ownerships: IOwnership[];
  memberships: IEntityMembership[];
  totalValue: number;
}

export interface IEntityPortfolio {
  entityId: string;
  entityName: string;
  totalValue: number;
  currency: string;
  accounts: {
    accountId: string;
    accountName: string;
    ownershipPercent: number;
    allocatedValue: number;
  }[];
  partnerships: {
    partnershipId: string;
    partnershipName: string;
    ownershipPercent: number;
    allocatedNav: number;
    irr?: number;
    tvpi?: number;
  }[];
  allocationByStructure: Record<string, { value: number; percentage: number }>;
  allocationByAssetClass: Record<string, { value: number; percentage: number }>;
}
