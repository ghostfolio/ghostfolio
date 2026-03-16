import { FamilyOfficePerformanceCalculator } from '@ghostfolio/api/app/portfolio/calculator/family-office/performance-calculator';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Injectable()
export class PartnershipService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async createPartnership(data: Prisma.PartnershipCreateInput) {
    return this.prismaService.partnership.create({ data });
  }

  public async getPartnerships({ userId }: { userId: string }) {
    const partnerships = await this.prismaService.partnership.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            members: true,
            assets: true
          }
        },
        valuations: {
          orderBy: { date: 'desc' },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    });

    return partnerships.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      inceptionDate: p.inceptionDate.toISOString(),
      currency: p.currency,
      latestNav: p.valuations[0] ? Number(p.valuations[0].nav) : null,
      latestNavDate: p.valuations[0]
        ? p.valuations[0].date.toISOString()
        : null,
      membersCount: p._count.members,
      assetsCount: p._count.assets
    }));
  }

  public async getPartnershipById({
    partnershipId,
    userId
  }: {
    partnershipId: string;
    userId: string;
  }) {
    const partnership = await this.prismaService.partnership.findFirst({
      where: { id: partnershipId, userId },
      include: {
        members: {
          where: { endDate: null },
          include: {
            entity: true
          }
        },
        assets: {
          include: {
            valuations: {
              orderBy: { date: 'desc' },
              take: 1
            }
          }
        },
        valuations: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    if (!partnership) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const latestNav = partnership.valuations[0]
      ? Number(partnership.valuations[0].nav)
      : 0;

    const members = partnership.members.map((m) => ({
      id: m.id,
      entityId: m.entityId,
      entityName: m.entity.name,
      ownershipPercent: Number(m.ownershipPercent),
      capitalCommitment: m.capitalCommitment
        ? Number(m.capitalCommitment)
        : undefined,
      capitalContributed: m.capitalContributed
        ? Number(m.capitalContributed)
        : undefined,
      classType: m.classType ?? undefined,
      allocatedNav: latestNav * (Number(m.ownershipPercent) / 100),
      effectiveDate: m.effectiveDate.toISOString()
    }));

    const assets = partnership.assets.map((a) => ({
      id: a.id,
      name: a.name,
      assetType: a.assetType,
      currentValue: a.valuations[0]
        ? Number(a.valuations[0].value)
        : a.currentValue
          ? Number(a.currentValue)
          : undefined,
      acquisitionCost: a.acquisitionCost
        ? Number(a.acquisitionCost)
        : undefined,
      currency: a.currency
    }));

    const totalCommitment = members.reduce(
      (sum, m) => sum + (m.capitalCommitment ?? 0),
      0
    );
    const totalContributed = members.reduce(
      (sum, m) => sum + (m.capitalContributed ?? 0),
      0
    );

    return {
      id: partnership.id,
      name: partnership.name,
      type: partnership.type,
      inceptionDate: partnership.inceptionDate.toISOString(),
      fiscalYearEnd: partnership.fiscalYearEnd,
      currency: partnership.currency,
      latestValuation: partnership.valuations[0]
        ? {
            date: partnership.valuations[0].date.toISOString(),
            nav: Number(partnership.valuations[0].nav),
            source: partnership.valuations[0].source
          }
        : null,
      members,
      assets,
      totalCommitment,
      totalContributed
    };
  }

  public async updatePartnership({
    partnershipId,
    userId,
    data
  }: {
    partnershipId: string;
    userId: string;
    data: { name?: string; fiscalYearEnd?: number };
  }) {
    const partnership = await this.prismaService.partnership.findFirst({
      where: { id: partnershipId, userId }
    });

    if (!partnership) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return this.prismaService.partnership.update({
      where: { id: partnershipId },
      data
    });
  }

  public async deletePartnership({
    partnershipId,
    userId
  }: {
    partnershipId: string;
    userId: string;
  }) {
    const partnership = await this.prismaService.partnership.findFirst({
      where: { id: partnershipId, userId }
    });

    if (!partnership) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    // Check for active members before deletion
    const activeMembers = await this.prismaService.partnershipMembership.count({
      where: { partnershipId, endDate: null }
    });

    if (activeMembers > 0) {
      throw new HttpException(
        'Partnership has active members and cannot be deleted',
        StatusCodes.CONFLICT
      );
    }

    return this.prismaService.partnership.delete({
      where: { id: partnershipId }
    });
  }

  public async addMember({
    partnershipId,
    userId,
    data
  }: {
    partnershipId: string;
    userId: string;
    data: {
      entityId: string;
      ownershipPercent: number;
      capitalCommitment?: number;
      capitalContributed?: number;
      classType?: string;
      effectiveDate: string;
    };
  }) {
    const partnership = await this.prismaService.partnership.findFirst({
      where: { id: partnershipId, userId }
    });

    if (!partnership) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    // Validate total membership <= 100%
    const existingMembers =
      await this.prismaService.partnershipMembership.findMany({
        where: { partnershipId, endDate: null }
      });

    const totalPercent = existingMembers.reduce(
      (sum, m) => sum + Number(m.ownershipPercent),
      0
    );

    if (totalPercent + data.ownershipPercent > 100) {
      throw new HttpException(
        'Total membership percentages would exceed 100%',
        StatusCodes.BAD_REQUEST
      );
    }

    return this.prismaService.partnershipMembership.create({
      data: {
        entity: { connect: { id: data.entityId } },
        partnership: { connect: { id: partnershipId } },
        ownershipPercent: data.ownershipPercent,
        capitalCommitment: data.capitalCommitment,
        capitalContributed: data.capitalContributed,
        classType: data.classType,
        effectiveDate: new Date(data.effectiveDate)
      }
    });
  }

  public async updateMember({
    partnershipId,
    membershipId,
    userId,
    data
  }: {
    partnershipId: string;
    membershipId: string;
    userId: string;
    data: {
      ownershipPercent?: number;
      capitalCommitment?: number;
      capitalContributed?: number;
      classType?: string;
    };
  }) {
    const partnership = await this.prismaService.partnership.findFirst({
      where: { id: partnershipId, userId }
    });

    if (!partnership) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const membership = await this.prismaService.partnershipMembership.findFirst(
      {
        where: { id: membershipId, partnershipId }
      }
    );

    if (!membership) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    // If updating ownership percent, validate total <= 100%
    if (data.ownershipPercent !== undefined) {
      const existingMembers =
        await this.prismaService.partnershipMembership.findMany({
          where: { partnershipId, endDate: null, id: { not: membershipId } }
        });

      const totalPercent = existingMembers.reduce(
        (sum, m) => sum + Number(m.ownershipPercent),
        0
      );

      if (totalPercent + data.ownershipPercent > 100) {
        throw new HttpException(
          'Total membership percentages would exceed 100%',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    return this.prismaService.partnershipMembership.update({
      where: { id: membershipId },
      data
    });
  }

  public async recordValuation({
    partnershipId,
    userId,
    data
  }: {
    partnershipId: string;
    userId: string;
    data: {
      date: string;
      nav: number;
      source: string;
      notes?: string;
    };
  }) {
    const partnership = await this.prismaService.partnership.findFirst({
      where: { id: partnershipId, userId }
    });

    if (!partnership) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    // Check for duplicate valuation date
    const existing = await this.prismaService.partnershipValuation.findFirst({
      where: { partnershipId, date: new Date(data.date) }
    });

    if (existing) {
      throw new HttpException(
        'Valuation already exists for this date',
        StatusCodes.CONFLICT
      );
    }

    return this.prismaService.partnershipValuation.create({
      data: {
        partnership: { connect: { id: partnershipId } },
        date: new Date(data.date),
        nav: data.nav,
        source: data.source as any,
        notes: data.notes
      }
    });
  }

  public async getValuations({
    partnershipId,
    userId,
    startDate,
    endDate
  }: {
    partnershipId: string;
    userId: string;
    startDate?: string;
    endDate?: string;
  }) {
    const partnership = await this.prismaService.partnership.findFirst({
      where: { id: partnershipId, userId }
    });

    if (!partnership) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const where: any = { partnershipId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const valuations = await this.prismaService.partnershipValuation.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    return valuations.map((v) => ({
      id: v.id,
      date: v.date.toISOString(),
      nav: Number(v.nav),
      source: v.source
    }));
  }

  public async addAsset({
    partnershipId,
    userId,
    data
  }: {
    partnershipId: string;
    userId: string;
    data: {
      name: string;
      assetType: string;
      description?: string;
      acquisitionDate?: string;
      acquisitionCost?: number;
      currentValue?: number;
      currency: string;
      metadata?: any;
    };
  }) {
    const partnership = await this.prismaService.partnership.findFirst({
      where: { id: partnershipId, userId }
    });

    if (!partnership) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return this.prismaService.partnershipAsset.create({
      data: {
        partnership: { connect: { id: partnershipId } },
        name: data.name,
        assetType: data.assetType as any,
        description: data.description,
        acquisitionDate: data.acquisitionDate
          ? new Date(data.acquisitionDate)
          : undefined,
        acquisitionCost: data.acquisitionCost,
        currentValue: data.currentValue,
        currency: data.currency,
        metadata: data.metadata ?? undefined
      }
    });
  }

  public async addAssetValuation({
    partnershipId,
    assetId,
    userId,
    data
  }: {
    partnershipId: string;
    assetId: string;
    userId: string;
    data: {
      date: string;
      value: number;
      source: string;
      notes?: string;
    };
  }) {
    const partnership = await this.prismaService.partnership.findFirst({
      where: { id: partnershipId, userId }
    });

    if (!partnership) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const asset = await this.prismaService.partnershipAsset.findFirst({
      where: { id: assetId, partnershipId }
    });

    if (!asset) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return this.prismaService.assetValuation.create({
      data: {
        partnershipAsset: { connect: { id: assetId } },
        date: new Date(data.date),
        value: data.value,
        source: data.source as any,
        notes: data.notes
      }
    });
  }

  public async getPerformance({
    partnershipId,
    userId,
    startDate,
    endDate
  }: {
    partnershipId: string;
    userId: string;
    periodicity?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const partnership = await this.prismaService.partnership.findFirst({
      where: { id: partnershipId, userId },
      include: {
        members: {
          where: { endDate: null }
        },
        valuations: {
          orderBy: { date: 'asc' }
        },
        distributions: true
      }
    });

    if (!partnership) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const valuations = partnership.valuations
      .filter((v) => {
        if (startDate && v.date < new Date(startDate)) return false;
        if (endDate && v.date > new Date(endDate)) return false;
        return true;
      })
      .map((v) => ({
        date: v.date,
        nav: Number(v.nav)
      }));

    // Calculate total contributions from members
    const totalContributions = partnership.members.reduce(
      (sum, m) => sum + Number(m.capitalContributed || 0),
      0
    );

    const totalDistributions = partnership.distributions.reduce(
      (sum, d) => sum + Number(d.amount),
      0
    );

    const latestNav =
      valuations.length > 0 ? valuations[valuations.length - 1].nav : 0;

    // Build cash flows for XIRR
    // Contributions are negative (outflows), distributions and final NAV are positive
    const cashFlows = [
      // Initial contribution at inception
      ...(totalContributions > 0
        ? [
            {
              amount: -totalContributions,
              date: partnership.inceptionDate
            }
          ]
        : []),
      // Distributions as inflows
      ...partnership.distributions.map((d) => ({
        amount: Number(d.amount),
        date: d.date
      })),
      // Final NAV as terminal value
      ...(valuations.length > 0
        ? [
            {
              amount: latestNav,
              date: valuations[valuations.length - 1].date
            }
          ]
        : [])
    ];

    // Compute XIRR
    const irr = FamilyOfficePerformanceCalculator.computeXIRR(cashFlows);

    // Compute multiples
    const tvpi = FamilyOfficePerformanceCalculator.computeTVPI(
      totalDistributions,
      latestNav,
      totalContributions
    );

    const dpi = FamilyOfficePerformanceCalculator.computeDPI(
      totalDistributions,
      totalContributions
    );

    const rvpi = FamilyOfficePerformanceCalculator.computeRVPI(
      latestNav,
      totalContributions
    );

    // Build Modified Dietz period returns
    const periodData = [];

    for (let i = 1; i < valuations.length; i++) {
      const periodCashFlows = partnership.distributions
        .filter(
          (d) =>
            d.date >= valuations[i - 1].date && d.date <= valuations[i].date
        )
        .map((d) => ({
          amount: Number(d.amount),
          date: d.date
        }));

      periodData.push({
        cashFlows: periodCashFlows,
        endDate: valuations[i].date,
        endValue: valuations[i].nav,
        startDate: valuations[i - 1].date,
        startValue: valuations[i - 1].nav
      });
    }

    const periodicReturns =
      FamilyOfficePerformanceCalculator.computeModifiedDietzReturns(periodData);

    return {
      partnershipId: partnership.id,
      partnershipName: partnership.name,
      metrics: {
        dpi,
        irr: irr !== null ? Math.round(irr * 10000) / 10000 : null,
        rvpi,
        tvpi
      },
      periods: periodicReturns.map((r) => ({
        contributions: 0,
        distributions: 0,
        endNav: r.endValue,
        periodEnd: r.endDate,
        periodStart: r.startDate,
        returnPercent: r.return,
        startNav: r.startValue
      })),
      benchmarkComparisons: []
    };
  }
}
