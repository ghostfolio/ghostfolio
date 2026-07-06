import { createSha512HmacHash } from '@ghostfolio/api/helper/hash.helper';
import { ApiKeyService } from '@ghostfolio/api/services/api-key/api-key.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { AccessSettings, Filter } from '@ghostfolio/common/interfaces';
import { AccessWithGranteeUser } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { Access, Prisma } from '@prisma/client';

@Injectable()
export class AccessService {
  public constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly configurationService: ConfigurationService,
    private readonly prismaService: PrismaService
  ) {}

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

  public createApiToken() {
    const apiToken = this.apiKeyService.generateApiKey();

    return {
      apiToken,
      hashedApiToken: this.hashApiToken(apiToken)
    };
  }

  public async deleteAccess(
    where: Prisma.AccessWhereUniqueInput
  ): Promise<Access> {
    return this.prismaService.access.delete({
      where
    });
  }

  public async getAccessByApiToken(
    apiToken: string
  ): Promise<AccessWithGranteeUser | null> {
    return this.prismaService.access.findUnique({
      include: {
        granteeUser: true
      },
      where: { hashedApiToken: this.hashApiToken(apiToken) }
    });
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

  private hashApiToken(apiToken: string) {
    // Rotating ACCESS_TOKEN_SALT invalidates all stored api tokens
    return createSha512HmacHash(
      apiToken,
      this.configurationService.get('ACCESS_TOKEN_SALT')
    );
  }
}
