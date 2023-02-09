import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response.interceptor';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import { Accounts } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type {
  AccountWithValue,
  RequestWithUser
} from '@ghostfolio/common/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Account as AccountModel } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AccountService } from './account.service';
import { CreateAccountDto } from './create-account.dto';
import { UpdateAccountDto } from './update-account.dto';

@Controller('account')
export class AccountController {
  public constructor(
    private readonly accountService: AccountService,
    private readonly impersonationService: ImpersonationService,
    private readonly portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  public async deleteAccount(@Param('id') id: string): Promise<AccountModel> {
    if (
      !hasPermission(this.request.user.permissions, permissions.deleteAccount)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const account = await this.accountService.accountWithOrders(
      {
        id_userId: {
          id,
          userId: this.request.user.id
        }
      },
      { Order: true }
    );

    if (account?.isDefault || account?.Order.length > 0) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.accountService.deleteAccount(
      {
        id_userId: {
          id,
          userId: this.request.user.id
        }
      },
      this.request.user.id
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async getAllAccounts(
    @Headers('impersonation-id') impersonationId
  ): Promise<Accounts> {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(
        impersonationId,
        this.request.user.id
      );

    return this.portfolioService.getAccountsWithAggregations({
      userId: impersonationUserId || this.request.user.id,
      withExcludedAccounts: true
    });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async getAccountById(
    @Headers('impersonation-id') impersonationId,
    @Param('id') id: string
  ): Promise<AccountWithValue> {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(
        impersonationId,
        this.request.user.id
      );

    const accountsWithAggregations =
      await this.portfolioService.getAccountsWithAggregations({
        filters: [{ id, type: 'ACCOUNT' }],
        userId: impersonationUserId || this.request.user.id,
        withExcludedAccounts: true
      });

    return accountsWithAggregations.accounts[0];
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  public async createAccount(
    @Body() data: CreateAccountDto
  ): Promise<AccountModel> {
    if (
      !hasPermission(this.request.user.permissions, permissions.createAccount)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    if (data.platformId) {
      const platformId = data.platformId;
      delete data.platformId;

      return this.accountService.createAccount(
        {
          ...data,
          Platform: { connect: { id: platformId } },
          User: { connect: { id: this.request.user.id } }
        },
        this.request.user.id
      );
    } else {
      delete data.platformId;

      return this.accountService.createAccount(
        {
          ...data,
          User: { connect: { id: this.request.user.id } }
        },
        this.request.user.id
      );
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  public async update(@Param('id') id: string, @Body() data: UpdateAccountDto) {
    if (
      !hasPermission(this.request.user.permissions, permissions.updateAccount)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const originalAccount = await this.accountService.account({
      id_userId: {
        id,
        userId: this.request.user.id
      }
    });

    if (!originalAccount) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    if (data.platformId) {
      const platformId = data.platformId;
      delete data.platformId;

      return this.accountService.updateAccount(
        {
          data: {
            ...data,
            Platform: { connect: { id: platformId } },
            User: { connect: { id: this.request.user.id } }
          },
          where: {
            id_userId: {
              id,
              userId: this.request.user.id
            }
          }
        },
        this.request.user.id
      );
    } else {
      // platformId is null, remove it
      delete data.platformId;

      return this.accountService.updateAccount(
        {
          data: {
            ...data,
            Platform: originalAccount.platformId
              ? { disconnect: true }
              : undefined,
            User: { connect: { id: this.request.user.id } }
          },
          where: {
            id_userId: {
              id,
              userId: this.request.user.id
            }
          }
        },
        this.request.user.id
      );
    }
  }
}
