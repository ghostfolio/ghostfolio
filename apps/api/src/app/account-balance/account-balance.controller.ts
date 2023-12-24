import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
import {
  Controller,
  Delete,
  HttpException,
  Inject,
  Param,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { AccountBalance } from '@prisma/client';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { AccountBalanceService } from './account-balance.service';

@Controller('account-balance')
export class AccountBalanceController {
  public constructor(
    private readonly accountBalanceService: AccountBalanceService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.deleteAccountBalance)
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
}
