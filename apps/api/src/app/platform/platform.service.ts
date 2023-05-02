import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Platform, Prisma } from '@prisma/client';

@Injectable()
export class PlatformService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async getPlatforms(): Promise<Platform[]> {
    return this.prismaService.platform.findMany();
  }

  public async getPlatform(
    platformWhereUniqueInput: Prisma.PlatformWhereUniqueInput
  ): Promise<Platform> {
    return this.prismaService.platform.findUnique({
      where: platformWhereUniqueInput
    });
  }

  public async createPlatform(data: Prisma.PlatformCreateInput) {
    return this.prismaService.platform.create({
      data
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

  public async deletePlatform(
    where: Prisma.PlatformWhereUniqueInput
  ): Promise<Platform> {
    return this.prismaService.platform.delete({ where });
  }
}
