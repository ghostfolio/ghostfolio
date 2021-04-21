import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AccessWithGranteeUser } from './interfaces/access-with-grantee-user.type';

@Injectable()
export class AccessService {
  public constructor(private prisma: PrismaService) {}

  public async accesses(params: {
    include?: Prisma.AccessInclude;
    skip?: number;
    take?: number;
    cursor?: Prisma.AccessWhereUniqueInput;
    where?: Prisma.AccessWhereInput;
    orderBy?: Prisma.AccessOrderByInput;
  }): Promise<AccessWithGranteeUser[]> {
    const { include, skip, take, cursor, where, orderBy } = params;

    return this.prisma.access.findMany({
      cursor,
      include,
      orderBy,
      skip,
      take,
      where
    });
  }
}
