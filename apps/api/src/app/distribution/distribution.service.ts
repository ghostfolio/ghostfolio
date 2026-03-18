import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { HttpException, Injectable } from '@nestjs/common';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Injectable()
export class DistributionService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async createDistribution({
    userId,
    data
  }: {
    userId: string;
    data: {
      partnershipId?: string;
      entityId: string;
      type: string;
      amount: number;
      date: string;
      currency: string;
      taxWithheld?: number;
      notes?: string;
    };
  }) {
    // Verify entity belongs to user
    const entity = await this.prismaService.entity.findFirst({
      where: { id: data.entityId, userId }
    });

    if (!entity) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    // If partnershipId provided, validate it belongs to user and date >= inception
    if (data.partnershipId) {
      const partnership = await this.prismaService.partnership.findFirst({
        where: { id: data.partnershipId, userId }
      });

      if (!partnership) {
        throw new HttpException(
          getReasonPhrase(StatusCodes.NOT_FOUND),
          StatusCodes.NOT_FOUND
        );
      }

      if (new Date(data.date) < partnership.inceptionDate) {
        throw new HttpException(
          'Distribution date cannot be before partnership inception date',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    return this.prismaService.distribution.create({
      data: {
        entity: { connect: { id: data.entityId } },
        partnership: data.partnershipId
          ? { connect: { id: data.partnershipId } }
          : undefined,
        type: data.type as any,
        amount: data.amount,
        date: new Date(data.date),
        currency: data.currency,
        taxWithheld: data.taxWithheld ?? 0,
        notes: data.notes
      }
    });
  }

  public async getDistributions({
    userId,
    entityId,
    partnershipId,
    type,
    startDate,
    endDate,
    groupBy
  }: {
    userId: string;
    entityId?: string;
    partnershipId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }) {
    // Build where clause — distributions belong to entities owned by user
    const userEntities = await this.prismaService.entity.findMany({
      where: { userId },
      select: { id: true }
    });
    const entityIds = userEntities.map((e) => e.id);

    const where: any = {
      entityId: entityId
        ? { in: entityIds.includes(entityId) ? [entityId] : [] }
        : { in: entityIds }
    };

    if (partnershipId) {
      where.partnershipId = partnershipId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const distributions = await this.prismaService.distribution.findMany({
      where,
      include: {
        partnership: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } }
      },
      orderBy: { date: 'desc' }
    });

    const mapped = distributions.map((d) => ({
      id: d.id,
      partnershipId: d.partnershipId,
      partnershipName: d.partnership?.name,
      entityId: d.entityId,
      entityName: d.entity.name,
      type: d.type,
      amount: Number(d.amount),
      date: d.date.toISOString(),
      currency: d.currency,
      taxWithheld: Number(d.taxWithheld ?? 0),
      netAmount: Number(d.amount) - Number(d.taxWithheld ?? 0),
      notes: d.notes
    }));

    // Build summary
    const totalGross = mapped.reduce((sum, d) => sum + d.amount, 0);
    const totalTaxWithheld = mapped.reduce((sum, d) => sum + d.taxWithheld, 0);
    const totalNet = totalGross - totalTaxWithheld;

    const byType: Record<string, number> = {};
    for (const d of mapped) {
      byType[d.type] = (byType[d.type] || 0) + d.amount;
    }

    const byPartnership: Record<string, { name: string; total: number }> = {};
    for (const d of mapped) {
      if (d.partnershipId) {
        if (!byPartnership[d.partnershipId]) {
          byPartnership[d.partnershipId] = {
            name: d.partnershipName ?? '',
            total: 0
          };
        }
        byPartnership[d.partnershipId].total += d.amount;
      }
    }

    const byPeriod: Record<string, number> = {};
    if (groupBy) {
      for (const d of mapped) {
        const date = new Date(d.date);
        let key: string;

        if (groupBy === 'MONTHLY') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else if (groupBy === 'QUARTERLY') {
          const quarter = Math.ceil((date.getMonth() + 1) / 3);
          key = `${date.getFullYear()}-Q${quarter}`;
        } else {
          key = `${date.getFullYear()}`;
        }

        byPeriod[key] = (byPeriod[key] || 0) + d.amount;
      }
    }

    return {
      distributions: mapped,
      summary: {
        totalGross: Math.round(totalGross * 100) / 100,
        totalTaxWithheld: Math.round(totalTaxWithheld * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        byType,
        byPartnership,
        byPeriod
      }
    };
  }

  public async deleteDistribution({
    distributionId,
    userId
  }: {
    distributionId: string;
    userId: string;
  }) {
    const distribution = await this.prismaService.distribution.findFirst({
      where: { id: distributionId },
      include: { entity: { select: { userId: true } } }
    });

    if (!distribution || distribution.entity.userId !== userId) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return this.prismaService.distribution.delete({
      where: { id: distributionId }
    });
  }
}
