import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { HEADER_KEY_IMPERSONATION } from '@ghostfolio/common/config';
import {
  AccountBalancesResponse,
  AccountsResponse
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
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
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Account as AccountModel } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AccountService } from './account.service';
import { CreateAccountDto } from './create-account.dto';
import { TransferBalanceDto } from './transfer-balance.dto';
import { UpdateAccountDto } from './update-account.dto';

@Controller('account')
export class AccountController {
  public constructor(
    private readonly accountBalanceService: AccountBalanceService,
    private readonly accountService: AccountService,
    private readonly apiService: ApiService,
    private readonly impersonationService: ImpersonationService,
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
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getAllAccounts(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('symbol') filterBySymbol?: string
  ): Promise<AccountsResponse> {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(impersonationId);

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByDataSource,
      filterBySymbol
    });

    return this.portfolioService.getAccountsWithAggregations({
      filters,
      userId: impersonationUserId || this.request.user.id,
      withExcludedAccounts: true
    });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async getAccountById(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Param('id') id: string
  ): Promise<AccountWithValue> {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(impersonationId);

    const accountsWithAggregations =
      await this.portfolioService.getAccountsWithAggregations({
        filters: [{ id, type: 'ACCOUNT' }],
        userId: impersonationUserId || this.request.user.id,
        withExcludedAccounts: true
      });

    return accountsWithAggregations.accounts[0];
  }

  @Get(':id/balances')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async getAccountBalancesById(
    @Param('id') id: string
  ): Promise<AccountBalancesResponse> {
    return this.accountBalanceService.getAccountBalances({
      filters: [{ id, type: 'ACCOUNT' }],
      userCurrency: this.request.user.Settings.settings.baseCurrency,
      userId: this.request.user.id
    });
  }

  @HasPermission(permissions.createAccount)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createAccount(
    @Body() data: CreateAccountDto
  ): Promise<AccountModel> {
    if (data.platformId) {
      const platformId = data.platformId;
      delete data.platformId;

      return this.accountService.createAccount(
        {
          ...data,
          Platform: { connect: { id: platformId } },
          user: { connect: { id: this.request.user.id } }
        },
        this.request.user.id
      );
    } else {
      delete data.platformId;

      return this.accountService.createAccount(
        {
          ...data,
          user: { connect: { id: this.request.user.id } }
        },
        this.request.user.id
      );
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

    if (data.platformId) {
      const platformId = data.platformId;
      delete data.platformId;

      return this.accountService.updateAccount(
        {
          data: {
            ...data,
            Platform: { connect: { id: platformId } },
            user: { connect: { id: this.request.user.id } }
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
            user: { connect: { id: this.request.user.id } }
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
