import { AccountBalances } from '@ghostfolio/api/app/account/interfaces/account-balances.interface';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
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

  public async getAccountBalances(accountId: string): Promise<AccountBalances> {
    const balances = await this.prismaService.accountBalance.findMany({
      where: {
        accountId: accountId,
      },
      select: {
        date: true,
        id: true,
        value: true
      }
    });
    return { balances }
  }
}
