import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ImpersonationGuard } from '@ghostfolio/api/guards/impersonation.guard';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import {
  CreateAccountDto,
  TransferBalanceDto,
  UpdateAccountDto
} from '@ghostfolio/common/dtos';
import {
  AccountBalancesResponse,
  AccountResponse,
  AccountsResponse
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type {
  ImpersonationContext,
  RequestWithUser
} from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Account as AccountModel } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AccountService } from './account.service';

@Controller('account')
export class AccountController {
  public constructor(
    private readonly accountBalanceService: AccountBalanceService,
    private readonly accountService: AccountService,
    private readonly apiService: ApiService,
    private readonly portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Delete(':id')
  @HasPermission(permissions.deleteAccount)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteAccount(@Param('id') id: string): Promise<AccountModel> {
    const account = await this.accountService.accountWithActivities(
      {
        id_userId: {
          id,
          userId: this.request.user.id
        }
      },
      { activities: true }
    );

    if (!account || account?.activities.length > 0) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.accountService.deleteAccount({
      id_userId: {
        id,
        userId: this.request.user.id
      }
    });
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard, ImpersonationGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getAllAccounts(
    @Impersonation() { userId }: ImpersonationContext,
    @Query('dataSource') filterByDataSource?: string,
    @Query('query') filterBySearchQuery?: string,
    @Query('symbol') filterBySymbol?: string
  ): Promise<AccountsResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByDataSource,
      filterBySearchQuery,
      filterBySymbol
    });

    return this.portfolioService.getAccountsWithAggregations({
      filters,
      userId,
      withExcludedAccounts: true
    });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard, ImpersonationGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async getAccountById(
    @Impersonation() { userId }: ImpersonationContext,
    @Param('id') id: string
  ): Promise<AccountResponse> {
    const accountsWithAggregations =
      await this.portfolioService.getAccountsWithAggregations({
        userId,
        filters: [{ id, type: 'ACCOUNT' }],
        withExcludedAccounts: true
      });

    return accountsWithAggregations.accounts[0];
  }

  @Get(':id/balances')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard, ImpersonationGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async getAccountBalancesById(
    @Impersonation() { userId, userSettings }: ImpersonationContext,
    @Param('id') id: string
  ): Promise<AccountBalancesResponse> {
    return this.accountBalanceService.getAccountBalances({
      userId,
      filters: [{ id, type: 'ACCOUNT' }],
      userCurrency: userSettings.baseCurrency
    });
  }

  @HasPermission(permissions.createAccount)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createAccount(
    @Body() data: CreateAccountDto
  ): Promise<AccountModel> {
    const { balance, tags: tagIds, ...accountData } = data;

    if (accountData.platformId) {
      const platformId = accountData.platformId;
      delete accountData.platformId;

      return this.accountService.createAccount({
        balance,
        tagIds,
        data: {
          ...accountData,
          platform: { connect: { id: platformId } },
          user: { connect: { id: this.request.user.id } }
        },
        userId: this.request.user.id
      });
    } else {
      delete accountData.platformId;

      return this.accountService.createAccount({
        balance,
        tagIds,
        data: {
          ...accountData,
          user: { connect: { id: this.request.user.id } }
        },
        userId: this.request.user.id
      });
    }
  }

  @HasPermission(permissions.updateAccount)
  @Post('transfer-balance')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async transferAccountBalance(
    @Body() { accountIdFrom, accountIdTo, balance }: TransferBalanceDto
  ) {
    const accountsOfUser = await this.accountService.getAccounts(
      this.request.user.id
    );

    const accountFrom = accountsOfUser.find(({ id }) => {
      return id === accountIdFrom;
    });

    const accountTo = accountsOfUser.find(({ id }) => {
      return id === accountIdTo;
    });

    if (!accountFrom || !accountTo) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    if (accountFrom.id === accountTo.id) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    if (accountFrom.balance < balance) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    await this.accountService.updateAccountBalance({
      accountId: accountFrom.id,
      amount: -balance,
      currency: accountFrom.currency,
      userId: this.request.user.id
    });

    await this.accountService.updateAccountBalance({
      accountId: accountTo.id,
      amount: balance,
      currency: accountFrom.currency,
      userId: this.request.user.id
    });
  }

  @HasPermission(permissions.updateAccount)
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async update(@Param('id') id: string, @Body() data: UpdateAccountDto) {
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

    const { balance, tags: tagIds, ...accountData } = data;

    if (accountData.platformId) {
      const platformId = accountData.platformId;
      delete accountData.platformId;

      return this.accountService.updateAccount({
        balance,
        tagIds,
        data: {
          ...accountData,
          platform: { connect: { id: platformId } },
          user: { connect: { id: this.request.user.id } }
        },
        userId: this.request.user.id,
        where: {
          id_userId: {
            id,
            userId: this.request.user.id
          }
        }
      });
    } else {
      // platformId is null, remove it
      delete accountData.platformId;

      return this.accountService.updateAccount({
        balance,
        tagIds,
        data: {
          ...accountData,
          platform: originalAccount.platformId
            ? { disconnect: true }
            : undefined,
          user: { connect: { id: this.request.user.id } }
        },
        userId: this.request.user.id,
        where: {
          id_userId: {
            id,
            userId: this.request.user.id
          }
        }
      });
    }
  }
}
