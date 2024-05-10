import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Controller,
  Body,
  Post,
  Delete,
  HttpException,
  Inject,
  Param,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AccountBalance } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AccountBalanceService } from './account-balance.service';
import { CreateAccountBalanceDto } from './create-account-balance.dto';

@Controller('account-balance')
export class AccountBalanceController {
  public constructor(
    private readonly accountBalanceService: AccountBalanceService,
    private readonly accountService: AccountService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @HasPermission(permissions.createAccountBalance)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createAccountBalance(
    @Body() data: CreateAccountBalanceDto
  ): Promise<AccountBalance> {
    const account = await this.accountService.account({
      id_userId: {
        id: data.accountId,
        userId: this.request.user.id
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
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteAccountBalance(
    @Param('id') id: string
  ): Promise<AccountBalance> {
    const accountBalance = await this.accountBalanceService.accountBalance({
      id,
      userId: this.request.user.id
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
