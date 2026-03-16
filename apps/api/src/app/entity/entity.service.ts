import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import type {
  IEntityPortfolio,
  IEntityWithRelations
} from '@ghostfolio/common/interfaces';

import { HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Injectable()
export class EntityService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async createEntity(data: Prisma.EntityCreateInput) {
    return this.prismaService.entity.create({ data });
  }

  public async getEntities({
    userId,
    type
  }: {
    userId: string;
    type?: string;
  }) {
    const where: Prisma.EntityWhereInput = { userId };

    if (type) {
      where.type = type as any;
    }

    const entities = await this.prismaService.entity.findMany({
      where,
      include: {
        _count: {
          select: {
            ownerships: true,
            memberships: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      taxId: entity.taxId,
      ownershipsCount: entity._count.ownerships,
      membershipsCount: entity._count.memberships,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString()
    }));
  }

  public async getEntityById({
    entityId,
    userId
  }: {
    entityId: string;
    userId: string;
  }): Promise<IEntityWithRelations> {
    const entity = await this.prismaService.entity.findFirst({
      where: { id: entityId, userId },
      include: {
        ownerships: {
          where: { endDate: null },
          include: {
            account: true
          }
        },
        memberships: {
          where: { endDate: null },
          include: {
            partnership: {
              include: {
                valuations: {
                  orderBy: { date: 'desc' },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!entity) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const ownerships = entity.ownerships.map((o) => ({
      id: o.id,
      accountId: o.accountId,
      accountName: o.account?.name ?? o.accountId,
      ownershipPercent: Number(o.ownershipPercent),
      effectiveDate: o.effectiveDate.toISOString(),
      endDate: o.endDate?.toISOString(),
      acquisitionDate: o.acquisitionDate?.toISOString(),
      costBasis: o.costBasis ? Number(o.costBasis) : undefined,
      allocatedValue: 0 // Placeholder — real value from portfolio aggregation
    }));

    const memberships = entity.memberships.map((m) => {
      const latestNav = m.partnership.valuations[0]?.nav;
      const allocatedNav = latestNav
        ? Number(latestNav) * (Number(m.ownershipPercent) / 100)
        : 0;

      return {
        id: m.id,
        partnershipId: m.partnershipId,
        partnershipName: m.partnership.name,
        ownershipPercent: Number(m.ownershipPercent),
        capitalCommitment: m.capitalCommitment
          ? Number(m.capitalCommitment)
          : undefined,
        capitalContributed: m.capitalContributed
          ? Number(m.capitalContributed)
          : undefined,
        classType: m.classType ?? undefined,
        allocatedNav: allocatedNav
      };
    });

    const totalValue = memberships.reduce(
      (sum, m) => sum + (m.allocatedNav ?? 0),
      0
    );

    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      taxId: entity.taxId ?? undefined,
      ownerships,
      memberships,
      totalValue,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString()
    };
  }

  public async updateEntity({
    entityId,
    userId,
    data
  }: {
    entityId: string;
    userId: string;
    data: { name?: string; taxId?: string };
  }) {
    const entity = await this.prismaService.entity.findFirst({
      where: { id: entityId, userId }
    });

    if (!entity) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return this.prismaService.entity.update({
      where: { id: entityId },
      data
    });
  }

  public async deleteEntity({
    entityId,
    userId
  }: {
    entityId: string;
    userId: string;
  }) {
    const entity = await this.prismaService.entity.findFirst({
      where: { id: entityId, userId },
      include: {
        ownerships: { where: { endDate: null } },
        memberships: { where: { endDate: null } }
      }
    });

    if (!entity) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    if (entity.ownerships.length > 0 || entity.memberships.length > 0) {
      throw new HttpException(
        'Entity has active relationships. Remove ownerships and memberships first.',
        StatusCodes.CONFLICT
      );
    }

    return this.prismaService.entity.delete({
      where: { id: entityId }
    });
  }

  public async createOwnership({
    entityId,
    userId,
    data
  }: {
    entityId: string;
    userId: string;
    data: {
      accountId: string;
      ownershipPercent: number;
      effectiveDate: string;
      acquisitionDate?: string;
      costBasis?: number;
    };
  }) {
    // Verify entity belongs to user
    const entity = await this.prismaService.entity.findFirst({
      where: { id: entityId, userId }
    });

    if (!entity) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    // Verify account belongs to user
    const account = await this.prismaService.account.findFirst({
      where: { id: data.accountId, userId }
    });

    if (!account) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    // Validate total ownership <= 100%
    const existingOwnerships = await this.prismaService.ownership.findMany({
      where: {
        accountId: data.accountId,
        accountUserId: userId,
        endDate: null
      }
    });

    const currentTotal = existingOwnerships.reduce(
      (sum, o) => sum + Number(o.ownershipPercent),
      0
    );

    if (currentTotal + data.ownershipPercent > 100) {
      throw new HttpException(
        `Total ownership for account would exceed 100% (current: ${currentTotal}%, requested: ${data.ownershipPercent}%)`,
        StatusCodes.BAD_REQUEST
      );
    }

    return this.prismaService.ownership.create({
      data: {
        entity: { connect: { id: entityId } },
        account: {
          connect: {
            id_userId: {
              id: data.accountId,
              userId
            }
          }
        },
        ownershipPercent: data.ownershipPercent,
        effectiveDate: new Date(data.effectiveDate),
        acquisitionDate: data.acquisitionDate
          ? new Date(data.acquisitionDate)
          : undefined,
        costBasis: data.costBasis
      }
    });
  }

  public async getEntityPortfolio({
    entityId,
    userId
  }: {
    entityId: string;
    userId: string;
  }): Promise<IEntityPortfolio> {
    const entity = await this.prismaService.entity.findFirst({
      where: { id: entityId, userId },
      include: {
        ownerships: {
          where: { endDate: null },
          include: { account: true }
        },
        memberships: {
          where: { endDate: null },
          include: {
            partnership: {
              include: {
                valuations: {
                  orderBy: { date: 'desc' },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!entity) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const accounts = entity.ownerships.map((o) => ({
      accountId: o.accountId,
      accountName: o.account?.name ?? o.accountId,
      ownershipPercent: Number(o.ownershipPercent),
      allocatedValue: 0 // Placeholder — requires portfolio calculation
    }));

    const partnerships = entity.memberships.map((m) => {
      const latestNav = m.partnership.valuations[0]?.nav;
      const allocatedNav = latestNav
        ? Number(latestNav) * (Number(m.ownershipPercent) / 100)
        : 0;

      return {
        partnershipId: m.partnershipId,
        partnershipName: m.partnership.name,
        ownershipPercent: Number(m.ownershipPercent),
        allocatedNav
      };
    });

    const totalValue =
      accounts.reduce((s, a) => s + a.allocatedValue, 0) +
      partnerships.reduce((s, p) => s + p.allocatedNav, 0);

    return {
      entityId: entity.id,
      entityName: entity.name,
      totalValue,
      currency: 'USD', // Default; real implementation uses user's base currency
      accounts,
      partnerships,
      allocationByStructure: {},
      allocationByAssetClass: {}
    };
  }

  public async getEntityDistributions({
    entityId,
    userId,
    startDate,
    endDate
  }: {
    entityId: string;
    userId: string;
    startDate?: string;
    endDate?: string;
  }) {
    const entity = await this.prismaService.entity.findFirst({
      where: { id: entityId, userId }
    });

    if (!entity) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const where: Prisma.DistributionWhereInput = { entityId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const distributions = await this.prismaService.distribution.findMany({
      where,
      include: {
        partnership: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    });

    return {
      distributions: distributions.map((d) => ({
        id: d.id,
        partnershipId: d.partnershipId,
        partnershipName: d.partnership?.name,
        entityId: d.entityId,
        type: d.type,
        amount: Number(d.amount),
        date: d.date.toISOString(),
        currency: d.currency,
        taxWithheld: d.taxWithheld ? Number(d.taxWithheld) : 0,
        netAmount:
          Number(d.amount) - (d.taxWithheld ? Number(d.taxWithheld) : 0),
        notes: d.notes
      })),
      summary: {
        totalGross: distributions.reduce((s, d) => s + Number(d.amount), 0),
        totalTaxWithheld: distributions.reduce(
          (s, d) => s + (d.taxWithheld ? Number(d.taxWithheld) : 0),
          0
        ),
        totalNet: distributions.reduce(
          (s, d) =>
            s + Number(d.amount) - (d.taxWithheld ? Number(d.taxWithheld) : 0),
          0
        ),
        byType: {},
        byPartnership: {},
        byPeriod: {}
      }
    };
  }

  public async getEntityKDocuments({
    entityId,
    userId,
    taxYear
  }: {
    entityId: string;
    userId: string;
    taxYear?: number;
  }) {
    const entity = await this.prismaService.entity.findFirst({
      where: { id: entityId, userId },
      include: {
        memberships: {
          where: { endDate: null },
          select: { partnershipId: true, ownershipPercent: true }
        }
      }
    });

    if (!entity) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const partnershipIds = entity.memberships.map((m) => m.partnershipId);

    const where: Prisma.KDocumentWhereInput = {
      partnershipId: { in: partnershipIds }
    };

    if (taxYear) {
      where.taxYear = taxYear;
    }

    const kDocuments = await this.prismaService.kDocument.findMany({
      where,
      include: {
        partnership: { select: { name: true } }
      },
      orderBy: [{ taxYear: 'desc' }, { type: 'asc' }]
    });

    return kDocuments.map((kDoc) => {
      const membership = entity.memberships.find(
        (m) => m.partnershipId === kDoc.partnershipId
      );
      const ownershipPercent = membership
        ? Number(membership.ownershipPercent)
        : 0;

      const data = kDoc.data as Record<string, number>;
      const allocatedAmounts: Record<string, number> = {};

      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number') {
          allocatedAmounts[key] = value * (ownershipPercent / 100);
        }
      }

      return {
        kDocumentId: kDoc.id,
        partnershipId: kDoc.partnershipId,
        partnershipName: kDoc.partnership.name,
        type: kDoc.type,
        taxYear: kDoc.taxYear,
        filingStatus: kDoc.filingStatus,
        ownershipPercent,
        allocatedAmounts
      };
    });
  }
}
