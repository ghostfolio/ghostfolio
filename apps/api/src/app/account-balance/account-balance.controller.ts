import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScope } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { CreateAccountBalanceDto } from '@ghostfolio/common/dtos';
import { permissions } from '@ghostfolio/common/permissions';
import { scopes } from '@ghostfolio/common/scopes';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import {
  Controller,
  Body,
  Post,
  Delete,
  HttpException,
  Param
} from '@nestjs/common';
import { AccountBalance } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AccountBalanceService } from './account-balance.service';

@Controller('account-balance')
export class AccountBalanceController {
  public constructor(
    private readonly accountBalanceService: AccountBalanceService,
    private readonly accountService: AccountService
  ) {}

  @HasPermission(permissions.createAccountBalance)
  @Post()
  @RequiresScope(scopes.accountWrite)
  public async createAccountBalance(
    @Body() data: CreateAccountBalanceDto,
    @Impersonation() { userId }: ImpersonationContext
  ): Promise<AccountBalance> {
    const account = await this.accountService.account({
      id_userId: {
        userId,
        id: data.accountId
      }
    });

    if (!account) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.accountBalanceService.createOrUpdateAccountBalance({
      accountId: account.id,
      balance: data.balance,
      date: data.date,
      userId: account.userId
    });
  }

  @HasPermission(permissions.deleteAccountBalance)
  @Delete(':id')
  @RequiresScope(scopes.accountWrite)
  public async deleteAccountBalance(
    @Impersonation() { userId }: ImpersonationContext,
    @Param('id') id: string
  ): Promise<AccountBalance> {
    const accountBalance = await this.accountBalanceService.accountBalance({
      id,
      userId
    });

    if (!accountBalance) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.accountBalanceService.deleteAccountBalance({
      id: accountBalance.id,
      userId: accountBalance.userId
    });
  }
}
