import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScope } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { AccountBalanceService } from '@ghostfolio/api/services/account-balance/account-balance.service';
import { AccountService } from '@ghostfolio/api/services/account/account.service';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import {
  CreateAccountBalanceDto,
  CreateAccountDto,
  TransferBalanceDto,
  UpdateAccountDto
} from '@ghostfolio/common/dtos';
import {
  AccountBalanceResponse,
  AccountBalancesResponse,
  AccountResponse,
  AccountsResponse
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { scopes } from '@ghostfolio/common/scopes';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors
} from '@nestjs/common';
import { Account as AccountModel } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { pick } from 'lodash-es';

import { GetAllAccountsDto } from './get-all-accounts.dto';

@Controller([
  'accounts',
  /** @deprecated */
  'account'
])
export class AccountsController {
  public constructor(
    private readonly accountBalanceService: AccountBalanceService,
    private readonly accountService: AccountService,
    private readonly apiService: ApiService,
    private readonly portfolioService: PortfolioService
  ) {}

  @Delete(':id')
  @HasPermission(permissions.deleteAccount)
  @RequiresScope(scopes.accountDelete)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async deleteAccount(
    @Impersonation() { userId }: ImpersonationContext,
    @Param('id') id: string
  ): Promise<AccountModel> {
    const account = await this.accountService.accountWithActivities(
      {
        id_userId: {
          id,
          userId
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
        userId
      }
    });
  }

  @Delete(':id/balances/:balanceId')
  @HasPermission(permissions.deleteAccountBalance)
  @RequiresScope(scopes.accountUpdate)
  public async deleteAccountBalance(
    @Impersonation() { userId }: ImpersonationContext,
    @Param('balanceId') balanceId: string,
    @Param('id') id: string
  ): Promise<void> {
    const accountBalance = await this.accountBalanceService.accountBalance({
      userId,
      accountId: id,
      id: balanceId
    });

    if (!accountBalance) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    await this.accountBalanceService.deleteAccountBalance({
      id: accountBalance.id,
      userId: accountBalance.userId
    });
  }

  @Get()
  @RequiresScope(scopes.accountRead)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getAllAccounts(
    @Impersonation() { userId }: ImpersonationContext,
    @Query()
    {
      accounts,
      assetClasses,
      dataSource,
      query,
      symbol,
      tags
    }: GetAllAccountsDto
  ): Promise<AccountsResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts: accounts,
      filterByAssetClasses: assetClasses,
      filterByDataSource: dataSource,
      filterBySearchQuery: query,
      filterBySymbol: symbol,
      filterByTags: tags
    });

    return this.portfolioService.getAccountsWithAggregations({
      filters,
      userId,
      withExcludedAccounts: true
    });
  }

  @Get(':id')
  @RequiresScope(scopes.accountRead)
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
  @RequiresScope(scopes.accountRead)
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
  @RequiresScope(scopes.accountCreate)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async createAccount(
    @Body() data: CreateAccountDto,
    @Impersonation() { userId }: ImpersonationContext
  ): Promise<AccountModel> {
    const { balance, tags: tagIds, ...accountData } = data;

    if (accountData.platformId) {
      const platformId = accountData.platformId;
      delete accountData.platformId;

      return this.accountService.createAccount({
        balance,
        tagIds,
        userId,
        data: {
          ...accountData,
          platform: { connect: { id: platformId } },
          user: { connect: { id: userId } }
        }
      });
    } else {
      delete accountData.platformId;

      return this.accountService.createAccount({
        balance,
        tagIds,
        userId,
        data: {
          ...accountData,
          user: { connect: { id: userId } }
        }
      });
    }
  }

  @HasPermission(permissions.createAccountBalance)
  @Post(':id/balances')
  @RequiresScope(scopes.accountUpdate)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async createAccountBalance(
    @Body() { balance, date }: CreateAccountBalanceDto,
    @Impersonation() { userId }: ImpersonationContext,
    @Param('id') id: string
  ): Promise<AccountBalanceResponse> {
    const account = await this.accountService.account({
      id_userId: {
        id,
        userId
      }
    });

    if (!account) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const accountBalance =
      await this.accountBalanceService.createOrUpdateAccountBalance({
        balance,
        date,
        accountId: account.id,
        userId: account.userId
      });

    return pick(accountBalance, ['accountId', 'date', 'id', 'value']);
  }

  @HasPermission(permissions.updateAccount)
  @Post('transfer-balance')
  @RequiresScope(scopes.accountUpdate)
  public async transferAccountBalance(
    @Body() { accountIdFrom, accountIdTo, balance }: TransferBalanceDto,
    @Impersonation() { userId }: ImpersonationContext
  ) {
    const accountsOfUser = await this.accountService.getAccounts(userId);

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
      userId,
      accountId: accountFrom.id,
      amount: -balance,
      currency: accountFrom.currency
    });

    await this.accountService.updateAccountBalance({
      userId,
      accountId: accountTo.id,
      amount: balance,
      currency: accountFrom.currency
    });
  }

  @HasPermission(permissions.updateAccount)
  @Put(':id')
  @RequiresScope(scopes.accountUpdate)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async update(
    @Body() data: UpdateAccountDto,
    @Impersonation() { userId }: ImpersonationContext,
    @Param('id') id: string
  ) {
    const originalAccount = await this.accountService.account({
      id_userId: {
        id,
        userId
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
        userId,
        data: {
          ...accountData,
          platform: { connect: { id: platformId } },
          user: { connect: { id: userId } }
        },
        where: {
          id_userId: {
            id,
            userId
          }
        }
      });
    } else {
      // platformId is null, remove it
      delete accountData.platformId;

      return this.accountService.updateAccount({
        balance,
        tagIds,
        userId,
        data: {
          ...accountData,
          platform: originalAccount.platformId
            ? { disconnect: true }
            : undefined,
          user: { connect: { id: userId } }
        },
        where: {
          id_userId: {
            id,
            userId
          }
        }
      });
    }
  }
}
