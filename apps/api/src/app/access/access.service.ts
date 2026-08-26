import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { AccessSettings, Filter } from '@ghostfolio/common/interfaces';
import { AccessWithGranteeUser } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { Access, Prisma } from '@prisma/client';
import { isBefore, isToday } from 'date-fns';

@Injectable()
export class AccessService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async access(
    accessWhereInput: Prisma.AccessWhereInput
  ): Promise<AccessWithGranteeUser | null> {
    return this.prismaService.access.findFirst({
      include: {
        granteeUser: true
      },
      where: accessWhereInput
    });
  }

  public async accesses(params: {
    cursor?: Prisma.AccessWhereUniqueInput;
    include?: Prisma.AccessInclude;
    orderBy?: Prisma.Enumerable<Prisma.AccessOrderByWithRelationInput>;
    skip?: number;
    take?: number;
    where?: Prisma.AccessWhereInput;
  }): Promise<AccessWithGranteeUser[]> {
    const { cursor, include, orderBy, skip, take, where } = params;

    return this.prismaService.access.findMany({
      cursor,
      include,
      orderBy,
      skip,
      take,
      where
    });
  }

  public buildSettings(filters?: Filter[]) {
    const settings: AccessSettings = filters?.length ? { filters } : {};

    return settings as Prisma.InputJsonValue;
  }

  public async createAccess(data: Prisma.AccessCreateInput): Promise<Access> {
    return this.prismaService.access.create({
      data
    });
  }

  public async deleteAccess(
    where: Prisma.AccessWhereUniqueInput
  ): Promise<Access> {
    return this.prismaService.access.delete({
      where
    });
  }

  public isExpired({ expiresAt }: Pick<Access, 'expiresAt'>) {
    return isBefore(expiresAt, new Date());
  }

  public async updateAccess({
    data,
    where
  }: {
    data: Prisma.AccessUpdateInput;
    where: Prisma.AccessWhereUniqueInput;
  }): Promise<Access> {
    return this.prismaService.access.update({
      data,
      where
    });
  }

  /**
   * Stores the date of the last usage of the access. The value is the first
   * usage of the day, because a request which repeats must not write to the
   * database again.
   */
  public async updateLastUsedAt({
    id,
    lastUsedAt
  }: Pick<Access, 'id' | 'lastUsedAt'>) {
    if (lastUsedAt && isToday(lastUsedAt)) {
      return;
    }

    try {
      await this.prismaService.access.update({
        data: { lastUsedAt: new Date() },
        where: { id }
      });
    } catch {
      // The date of the last usage is not essential for the request, hence a
      // failure to store it must not fail the request
    }
  }
}
