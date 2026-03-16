import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import type { K1Data } from '@ghostfolio/common/interfaces';

import { HttpException, Injectable } from '@nestjs/common';
import { KDocumentStatus, KDocumentType, Prisma } from '@prisma/client';
import Big from 'big.js';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

const K1_DATA_FIELDS: (keyof K1Data)[] = [
  'ordinaryIncome',
  'netRentalIncome',
  'otherRentalIncome',
  'guaranteedPayments',
  'interestIncome',
  'dividends',
  'qualifiedDividends',
  'royalties',
  'capitalGainLossShortTerm',
  'capitalGainLossLongTerm',
  'unrecaptured1250Gain',
  'section1231GainLoss',
  'otherIncome',
  'section179Deduction',
  'otherDeductions',
  'selfEmploymentEarnings',
  'foreignTaxesPaid',
  'alternativeMinimumTaxItems',
  'distributionsCash',
  'distributionsProperty'
];

@Injectable()
export class KDocumentService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async createKDocument({
    data,
    filingStatus,
    partnershipId,
    taxYear,
    type,
    userId
  }: {
    data: Record<string, number>;
    filingStatus?: KDocumentStatus;
    partnershipId: string;
    taxYear: number;
    type: KDocumentType;
    userId: string;
  }) {
    // Verify partnership exists and belongs to user
    const partnership = await this.prismaService.partnership.findFirst({
      where: {
        id: partnershipId,
        members: {
          some: {
            entity: {
              userId
            }
          }
        }
      }
    });

    if (!partnership) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    // Check inception year
    const inceptionYear = partnership.inceptionDate.getFullYear();

    if (taxYear < inceptionYear) {
      throw new HttpException(
        `Tax year must be >= partnership inception year (${inceptionYear})`,
        StatusCodes.BAD_REQUEST
      );
    }

    // Check for duplicate
    const existing = await this.prismaService.kDocument.findUnique({
      where: {
        partnershipId_type_taxYear: {
          partnershipId,
          taxYear,
          type
        }
      }
    });

    if (existing) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.CONFLICT),
        StatusCodes.CONFLICT
      );
    }

    // Normalize data
    const normalizedData = this.normalizeK1Data(data);

    const kDocument = await this.prismaService.kDocument.create({
      data: {
        data: normalizedData as unknown as Prisma.JsonObject,
        filingStatus: filingStatus || KDocumentStatus.DRAFT,
        partnershipId,
        taxYear,
        type
      },
      include: {
        partnership: {
          select: { name: true }
        }
      }
    });

    // Compute allocations
    const allocations = await this.computeAllocations(
      partnershipId,
      normalizedData
    );

    return {
      ...kDocument,
      allocations,
      partnershipName: kDocument.partnership.name
    };
  }

  public async getKDocuments({
    filingStatus,
    partnershipId,
    taxYear,
    type,
    userId
  }: {
    filingStatus?: KDocumentStatus;
    partnershipId?: string;
    taxYear?: number;
    type?: KDocumentType;
    userId: string;
  }) {
    const where: Prisma.KDocumentWhereInput = {
      partnership: {
        members: {
          some: {
            entity: {
              userId
            }
          }
        }
      }
    };

    if (partnershipId) {
      where.partnershipId = partnershipId;
    }

    if (taxYear) {
      where.taxYear = taxYear;
    }

    if (type) {
      where.type = type;
    }

    if (filingStatus) {
      where.filingStatus = filingStatus;
    }

    const kDocuments = await this.prismaService.kDocument.findMany({
      include: {
        documentFile: {
          select: { id: true, name: true }
        },
        partnership: {
          select: { name: true }
        }
      },
      orderBy: [{ taxYear: 'desc' }, { type: 'asc' }],
      where
    });

    const results = [];

    for (const doc of kDocuments) {
      const allocations = await this.computeAllocations(
        doc.partnershipId,
        doc.data as Record<string, number>
      );

      results.push({
        allocations,
        createdAt: doc.createdAt.toISOString(),
        data: doc.data,
        documentFileId: doc.documentFileId,
        filingStatus: doc.filingStatus,
        id: doc.id,
        partnershipId: doc.partnershipId,
        partnershipName: doc.partnership.name,
        taxYear: doc.taxYear,
        type: doc.type,
        updatedAt: doc.updatedAt.toISOString()
      });
    }

    return results;
  }

  public async updateKDocument({
    data,
    filingStatus,
    kDocumentId,
    userId
  }: {
    data?: Record<string, number>;
    filingStatus?: KDocumentStatus;
    kDocumentId: string;
    userId: string;
  }) {
    const existing = await this.prismaService.kDocument.findFirst({
      include: {
        partnership: {
          select: { name: true }
        }
      },
      where: {
        id: kDocumentId,
        partnership: {
          members: {
            some: {
              entity: {
                userId
              }
            }
          }
        }
      }
    });

    if (!existing) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    // Merge data if provided (spread operator for partial update)
    let updatedData = existing.data as Record<string, number>;

    if (data) {
      updatedData = { ...updatedData, ...this.normalizeK1Data(data) };
    }

    const updateData: Prisma.KDocumentUpdateInput = {
      data: updatedData as unknown as Prisma.JsonObject
    };

    if (filingStatus) {
      updateData.filingStatus = filingStatus;
    }

    const updated = await this.prismaService.kDocument.update({
      data: updateData,
      include: {
        partnership: {
          select: { name: true }
        }
      },
      where: { id: kDocumentId }
    });

    const allocations = await this.computeAllocations(
      updated.partnershipId,
      updatedData
    );

    return {
      ...updated,
      allocations,
      partnershipName: updated.partnership.name
    };
  }

  public async linkDocument({
    documentId,
    kDocumentId,
    userId
  }: {
    documentId: string;
    kDocumentId: string;
    userId: string;
  }) {
    // Verify K-document belongs to user
    const kDoc = await this.prismaService.kDocument.findFirst({
      where: {
        id: kDocumentId,
        partnership: {
          members: {
            some: {
              entity: {
                userId
              }
            }
          }
        }
      }
    });

    if (!kDoc) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    // Verify document exists
    const document = await this.prismaService.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return this.prismaService.kDocument.update({
      data: {
        documentFileId: documentId
      },
      include: {
        partnership: {
          select: { name: true }
        }
      },
      where: { id: kDocumentId }
    });
  }

  private async computeAllocations(
    partnershipId: string,
    data: Record<string, number>
  ) {
    const memberships = await this.prismaService.partnershipMembership.findMany(
      {
        include: {
          entity: {
            select: { id: true, name: true }
          }
        },
        where: {
          endDate: null,
          partnershipId
        }
      }
    );

    return memberships.map((membership) => {
      const ownershipPercent = new Big(membership.ownershipPercent.toString());
      const allocatedAmounts: Record<string, number> = {};

      for (const field of K1_DATA_FIELDS) {
        const value = data[field];

        if (value !== undefined && value !== 0) {
          allocatedAmounts[field] = ownershipPercent
            .div(100)
            .times(value)
            .round(2)
            .toNumber();
        }
      }

      return {
        allocatedAmounts,
        entityId: membership.entity.id,
        entityName: membership.entity.name,
        ownershipPercent: ownershipPercent.toNumber()
      };
    });
  }

  private normalizeK1Data(
    data: Record<string, number>
  ): Record<string, number> {
    const normalized: Record<string, number> = {};

    for (const field of K1_DATA_FIELDS) {
      normalized[field] = data[field] !== undefined ? Number(data[field]) : 0;
    }

    return normalized;
  }
}
