import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { AccountBalancesResponse } from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';
import { AccountBalance, Prisma } from '@prisma/client';

@Injectable()
export class AccountBalanceService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async createAccountBalance(
    data: Prisma.AccountBalanceCreateInput
  ): Promise<AccountBalance> {
    return this.prismaService.accountBalance.create({
      data
    });
  }

  public async getAccountBalances({
    accountId,
    userId
  }: {
    accountId?: string; // TODO: With filters?
    userId: string;
  }): Promise<AccountBalancesResponse> {
    const balances = await this.prismaService.accountBalance.findMany({
      orderBy: {
        date: 'asc'
      },
      select: {
        date: true,
        id: true,
        value: true
      },
      where: {
        accountId,
        userId
      }
    });

    return { balances };
  }
}
