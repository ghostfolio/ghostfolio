import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable } from '@nestjs/common';
import { Platform, Prisma } from '@prisma/client';

@Injectable()
export class PlatformService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async createPlatform(data: Prisma.PlatformCreateInput) {
    return this.prismaService.platform.create({
      data
    });
  }

  public async deletePlatform(
    where: Prisma.PlatformWhereUniqueInput
  ): Promise<Platform> {
    return this.prismaService.platform.delete({ where });
  }

  public async getPlatform(
    platformWhereUniqueInput: Prisma.PlatformWhereUniqueInput
  ): Promise<Platform> {
    return this.prismaService.platform.findUnique({
      where: platformWhereUniqueInput
    });
  }

  public async getPlatforms({
    cursor,
    orderBy,
    skip,
    take,
    where
  }: {
    cursor?: Prisma.PlatformWhereUniqueInput;
    orderBy?: Prisma.PlatformOrderByWithRelationInput;
    skip?: number;
    take?: number;
    where?: Prisma.PlatformWhereInput;
  } = {}) {
    return this.prismaService.platform.findMany({
      cursor,
      orderBy,
      skip,
      take,
      where
    });
  }

  public async getPlatformsWithAccountCount() {
    const platformsWithAccountCount =
      await this.prismaService.platform.findMany({
        include: {
          _count: {
            select: { Account: true }
          }
        }
      });

    return platformsWithAccountCount.map(({ _count, id, name, url }) => {
      return {
        id,
        name,
        url,
        accountCount: _count.Account
      };
    });
  }

  public async updatePlatform({
    data,
    where
  }: {
    data: Prisma.PlatformUpdateInput;
    where: Prisma.PlatformWhereUniqueInput;
  }): Promise<Platform> {
    return this.prismaService.platform.update({
      data,
      where
    });
  }
}
