import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Account, Prisma } from '@prisma/client';

import { RedisCacheService } from '../redis-cache/redis-cache.service';

@Injectable()
export class AccountService {
  public constructor(
    private readonly redisCacheService: RedisCacheService,
    private prisma: PrismaService
  ) {}

  public async account(
    accountWhereUniqueInput: Prisma.AccountWhereUniqueInput
  ): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: accountWhereUniqueInput
    });
  }

  public async accounts(params: {
    include?: Prisma.AccountInclude;
    skip?: number;
    take?: number;
    cursor?: Prisma.AccountWhereUniqueInput;
    where?: Prisma.AccountWhereInput;
    orderBy?: Prisma.AccountOrderByInput;
  }): Promise<Account[]> {
    const { include, skip, take, cursor, where, orderBy } = params;

    return this.prisma.account.findMany({
      cursor,
      include,
      orderBy,
      skip,
      take,
      where
    });
  }

  public async createAccount(
    data: Prisma.AccountCreateInput,
    aUserId: string
  ): Promise<Account> {
    return this.prisma.account.create({
      data
    });
  }

  public async deleteAccount(
    where: Prisma.AccountWhereUniqueInput,
    aUserId: string
  ): Promise<Account> {
    this.redisCacheService.remove(`${aUserId}.portfolio`);

    return this.prisma.account.delete({
      where
    });
  }

  public async updateAccount(
    params: {
      where: Prisma.AccountWhereUniqueInput;
      data: Prisma.AccountUpdateInput;
    },
    aUserId: string
  ): Promise<Account> {
    const { data, where } = params;
    return this.prisma.account.update({
      data,
      where
    });
  }
}
