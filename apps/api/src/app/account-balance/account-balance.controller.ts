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
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @HasPermission(permissions.deleteAccountBalance)
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteAccountBalance(
    @Param('id') id: string
  ): Promise<AccountBalance> {
    const accountBalance = await this.accountBalanceService.accountBalance({
      id
    });

    if (!accountBalance || accountBalance.userId !== this.request.user.id) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.accountBalanceService.deleteAccountBalance({
      id
    });
  }

  @HasPermission(permissions.createAccountBalance)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createAccountBalance(
    @Body() data: CreateAccountBalanceDto
  ): Promise<AccountBalance> {
    const account = data.Account.connect.id_userId;
    const body = {
      Account: {
        connect: {
          id_userId: {
            id: account.id,
            userId: this.request.user.id
          }
        }
      },
      value: data.balance,
      date: data.date
    };
    return this.accountBalanceService.createAccountBalance(body);
  }
}
