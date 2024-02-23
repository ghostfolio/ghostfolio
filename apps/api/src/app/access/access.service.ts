import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { AccessWithGranteeUser } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { Access, Prisma } from '@prisma/client';

@Injectable()
export class AccessService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async access(
    accessWhereInput: Prisma.AccessWhereInput
  ): Promise<AccessWithGranteeUser | null> {
    return this.prismaService.access.findFirst({
      include: {
        GranteeUser: true
      },
      where: accessWhereInput
    });
  }

  public async accesses(params: {
    include?: Prisma.AccessInclude;
    skip?: number;
    take?: number;
    cursor?: Prisma.AccessWhereUniqueInput;
    where?: Prisma.AccessWhereInput;
    orderBy?: Prisma.AccessOrderByWithRelationInput;
  }): Promise<AccessWithGranteeUser[]> {
    const { include, skip, take, cursor, where, orderBy } = params;

    return this.prismaService.access.findMany({
      cursor,
      include,
      orderBy,
      skip,
      take,
      where
    });
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
}
