import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { AccessWithGranteeUser } from '@ghostfolio/common/types';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class AccessService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async accesses(params: {
    include?: Prisma.AccessInclude;
    skip?: number;
    take?: number;
    cursor?: Prisma.AccessWhereUniqueInput;
    where?: Prisma.AccessWhereInput;
    orderBy?: Prisma.AccessOrderByInput;
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
}
