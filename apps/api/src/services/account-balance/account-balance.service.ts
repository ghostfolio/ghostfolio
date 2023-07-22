import { Injectable } from '@nestjs/common';
import { AccountBalance, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

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
}
