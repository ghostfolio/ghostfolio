import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

interface MemberAllocation {
  entityId: string;
  entityName: string;
  ownershipPercent: number;
  allocatedValues: Record<string, number>;
}

/**
 * Service for allocating K-1 line items to partnership members
 * by ownership percentage. FR-013.
 * Rounding adjustment: residual cents assigned to the largest member (validation rule 8).
 */
@Injectable()
export class K1AllocationService {
  private readonly logger = new Logger(K1AllocationService.name);

  public constructor(private readonly prismaService: PrismaService) {}

  /**
   * Allocate K-1 box values to partnership members by ownership %.
   * Returns allocations per member with proportional values.
   */
  public async allocateToMembers(
    partnershipId: string,
    taxYear: number,
    fields: Array<{ boxNumber: string; numericValue: number | null }>
  ): Promise<MemberAllocation[]> {
    // Get active members as of tax year end
    const taxYearEnd = new Date(taxYear, 11, 31); // Dec 31 of tax year

    const memberships = await this.prismaService.partnershipMembership.findMany(
      {
        where: {
          partnershipId,
          effectiveDate: { lte: taxYearEnd },
          OR: [{ endDate: null }, { endDate: { gte: taxYearEnd } }]
        },
        include: {
          entity: true
        },
        orderBy: {
          ownershipPercent: 'desc' // Largest member first for rounding
        }
      }
    );

    if (memberships.length === 0) {
      return [];
    }

    const allocations: MemberAllocation[] = memberships.map((m) => ({
      entityId: m.entityId,
      entityName: m.entity.name || m.entityId,
      ownershipPercent: new Decimal(m.ownershipPercent).toNumber(),
      allocatedValues: {}
    }));

    // For each field with a numeric value, allocate proportionally
    for (const field of fields) {
      if (field.numericValue === null || field.numericValue === undefined) {
        continue;
      }

      const totalCents = Math.round(field.numericValue * 100);
      let allocatedCents = 0;

      // Allocate to each member except the largest (first)
      for (let i = 1; i < allocations.length; i++) {
        const memberCents = Math.round(
          (totalCents * allocations[i].ownershipPercent) / 100
        );
        allocations[i].allocatedValues[field.boxNumber] = memberCents / 100;
        allocatedCents += memberCents;
      }

      // Largest member gets the remainder (rounding adjustment - validation rule 8)
      allocations[0].allocatedValues[field.boxNumber] =
        (totalCents - allocatedCents) / 100;
    }

    this.logger.log(
      `Allocated ${fields.length} fields to ${memberships.length} members for partnership ${partnershipId}`
    );

    return allocations;
  }
}
