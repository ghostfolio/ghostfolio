import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { CreateAccountBalanceDto } from '@ghostfolio/api/app/account-balance/create-account-balance.dto';
import { CreateAccountDto } from '@ghostfolio/api/app/account/create-account.dto';
import { TransferBalanceDto } from '@ghostfolio/api/app/account/transfer-balance.dto';
import { UpdateAccountDto } from '@ghostfolio/api/app/account/update-account.dto';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Activities } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { PortfolioHoldingDetail } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-holding-detail.interface';
import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { SymbolItem } from '@ghostfolio/api/app/symbol/interfaces/symbol-item.interface';
import { DeleteOwnUserDto } from '@ghostfolio/api/app/user/delete-own-user.dto';
import { UserItem } from '@ghostfolio/api/app/user/interfaces/user-item.interface';
import { UpdateUserSettingDto } from '@ghostfolio/api/app/user/update-user-setting.dto';
import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';
import { PropertyDto } from '@ghostfolio/api/services/property/property.dto';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  Access,
  AccountBalancesResponse,
  Accounts,
  AdminMarketDataDetails,
  BenchmarkMarketDataDetails,
  BenchmarkResponse,
  Export,
  Filter,
  ImportResponse,
  InfoItem,
  OAuthResponse,
  PortfolioDetails,
  PortfolioDividends,
  PortfolioHoldingsResponse,
  PortfolioInvestments,
  PortfolioPerformanceResponse,
  PortfolioPublicDetails,
  PortfolioReport,
  UniqueAsset,
  User
} from '@ghostfolio/common/interfaces';
import { filterGlobalPermissions } from '@ghostfolio/common/permissions';
import { AccountWithValue, DateRange, GroupBy } from '@ghostfolio/common/types';
import { translate } from '@ghostfolio/ui/i18n';

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';
import {
  AccountBalance,
  DataSource,
  Order as OrderModel
} from '@prisma/client';
import { format, parseISO } from 'date-fns';
import { cloneDeep, groupBy, isNumber } from 'lodash';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  public constructor(private http: HttpClient) {}

  public buildFiltersAsQueryParams({ filters }: { filters?: Filter[] }) {
    let params = new HttpParams();

    if (filters?.length > 0) {
      const {
        ACCOUNT: filtersByAccount,
        ASSET_CLASS: filtersByAssetClass,
        ASSET_SUB_CLASS: filtersByAssetSubClass,
        HOLDING_TYPE: filtersByHoldingType,
        PRESET_ID: filtersByPresetId,
        SEARCH_QUERY: filtersBySearchQuery,
        TAG: filtersByTag
      } = groupBy(filters, (filter) => {
        return filter.type;
      });

      if (filtersByAccount) {
        params = params.append(
          'accounts',
          filtersByAccount
            .map(({ id }) => {
              return id;
            })
            .join(',')
        );
      }

      if (filtersByAssetClass) {
        params = params.append(
          'assetClasses',
          filtersByAssetClass
            .map(({ id }) => {
              return id;
            })
            .join(',')
        );
      }

      if (filtersByAssetSubClass) {
        params = params.append(
          'assetSubClasses',
          filtersByAssetSubClass
            .map(({ id }) => {
              return id;
            })
            .join(',')
        );
      }

      if (filtersByHoldingType) {
        params = params.append('holdingType', filtersByHoldingType[0].id);
      }

      if (filtersByPresetId) {
        params = params.append('presetId', filtersByPresetId[0].id);
      }

      if (filtersBySearchQuery) {
        params = params.append('query', filtersBySearchQuery[0].id);
      }

      if (filtersByTag) {
        params = params.append(
          'tags',
          filtersByTag
            .map(({ id }) => {
              return id;
            })
            .join(',')
        );
      }
    }

    return params;
  }

  public createCheckoutSession({
    couponId,
    priceId
  }: {
    couponId?: string;
    priceId: string;
  }) {
    return this.http.post('/api/v1/subscription/stripe/checkout-session', {
      couponId,
      priceId
    });
  }

  public fetchAccount(aAccountId: string) {
    return this.http.get<AccountWithValue>(`/api/v1/account/${aAccountId}`);
  }

  public fetchAccountBalances(aAccountId: string) {
    return this.http.get<AccountBalancesResponse>(
      `/api/v1/account/${aAccountId}/balances`
    );
  }

  public fetchAccounts() {
    return this.http.get<Accounts>('/api/v1/account');
  }

  public fetchActivities({
    filters,
    range,
    skip,
    sortColumn,
    sortDirection,
    take
  }: {
    filters?: Filter[];
    range?: DateRange;
    skip?: number;
    sortColumn?: string;
    sortDirection?: SortDirection;
    take?: number;
  }): Observable<Activities> {
    let params = this.buildFiltersAsQueryParams({ filters });

    if (range) {
      params = params.append('range', range);
    }

    if (skip) {
      params = params.append('skip', skip);
    }

    if (sortColumn) {
      params = params.append('sortColumn', sortColumn);
    }

    if (sortDirection) {
      params = params.append('sortDirection', sortDirection);
    }

    if (take) {
      params = params.append('take', take);
    }

    return this.http.get<any>('/api/v1/order', { params }).pipe(
      map(({ activities, count }) => {
        for (const activity of activities) {
          activity.createdAt = parseISO(activity.createdAt);
          activity.date = parseISO(activity.date);
        }
        return { activities, count };
      })
    );
  }

  public fetchDividends({
    filters,
    groupBy = 'month',
    range
  }: {
    filters?: Filter[];
    groupBy?: GroupBy;
    range: DateRange;
  }) {
    let params = this.buildFiltersAsQueryParams({ filters });
    params = params.append('groupBy', groupBy);
    params = params.append('range', range);

    return this.http.get<PortfolioDividends>('/api/v1/portfolio/dividends', {
      params
    });
  }

  public fetchDividendsImport({ dataSource, symbol }: UniqueAsset) {
    return this.http.get<ImportResponse>(
      `/api/v1/import/dividends/${dataSource}/${symbol}`
    );
  }

  public fetchExchangeRateForDate({
    date,
    symbol
  }: {
    date: Date;
    symbol: string;
  }) {
    return this.http.get<IDataProviderHistoricalResponse>(
      `/api/v1/exchange-rate/${symbol}/${format(date, DATE_FORMAT)}`
    );
  }

  public deleteAccess(aId: string) {
    return this.http.delete<any>(`/api/v1/access/${aId}`);
  }

  public deleteAccount(aId: string) {
    return this.http.delete<any>(`/api/v1/account/${aId}`);
  }

  public deleteAccountBalance(aId: string) {
    return this.http.delete<any>(`/api/v1/account-balance/${aId}`);
  }

  public deleteActivities({ filters }) {
    let params = this.buildFiltersAsQueryParams({ filters });

    return this.http.delete<any>(`/api/v1/order`, { params });
  }

  public deleteActivity(aId: string) {
    return this.http.delete<any>(`/api/v1/order/${aId}`);
  }

  public deleteBenchmark({ dataSource, symbol }: UniqueAsset) {
    return this.http.delete<any>(`/api/v1/benchmark/${dataSource}/${symbol}`);
  }

  public deleteOwnUser(aData: DeleteOwnUserDto) {
    return this.http.delete<any>(`/api/v1/user`, { body: aData });
  }

  public deleteUser(aId: string) {
    return this.http.delete<any>(`/api/v1/user/${aId}`);
  }

  public fetchAccesses() {
    return this.http.get<Access[]>('/api/v1/access');
  }

  public fetchAsset({
    dataSource,
    symbol
  }: UniqueAsset): Observable<AdminMarketDataDetails> {
    return this.http.get<any>(`/api/v1/asset/${dataSource}/${symbol}`).pipe(
      map((data) => {
        for (const item of data.marketData) {
          item.date = parseISO(item.date);
        }
        return data;
      })
    );
  }

  public fetchBenchmarkForUser({
    dataSource,
    range,
    startDate,
    symbol
  }: {
    range: DateRange;
    startDate: Date;
  } & UniqueAsset): Observable<BenchmarkMarketDataDetails> {
    let params = new HttpParams();

    if (range) {
      params = params.append('range', range);
    }

    return this.http.get<BenchmarkMarketDataDetails>(
      `/api/v1/benchmark/${dataSource}/${symbol}/${format(
        startDate,
        DATE_FORMAT
      )}`,
      { params }
    );
  }

  public fetchBenchmarks() {
    return this.http.get<BenchmarkResponse>('/api/v1/benchmark');
  }

  public fetchExport({
    activityIds,
    filters
  }: {
    activityIds?: string[];
    filters?: Filter[];
  } = {}) {
    let params = this.buildFiltersAsQueryParams({ filters });

    if (activityIds) {
      params = params.append('activityIds', activityIds.join(','));
    }

    return this.http.get<Export>('/api/v1/export', {
      params
    });
  }

  public fetchHoldingDetail({
    dataSource,
    symbol
  }: {
    dataSource: DataSource;
    symbol: string;
  }) {
    return this.http
      .get<PortfolioHoldingDetail>(
        `/api/v1/portfolio/position/${dataSource}/${symbol}`
      )
      .pipe(
        map((data) => {
          if (data.orders) {
            for (const order of data.orders) {
              order.createdAt = parseISO(<string>(<unknown>order.createdAt));
              order.date = parseISO(<string>(<unknown>order.date));
            }
          }

          return data;
        })
      );
  }

  public fetchInfo(): InfoItem {
    const info = cloneDeep((window as any).info);
    const utmSource = <'ios' | 'trusted-web-activity'>(
      window.localStorage.getItem('utm_source')
    );

    info.globalPermissions = filterGlobalPermissions(
      info.globalPermissions,
      utmSource
    );

    return info;
  }

  public fetchInvestments({
    filters,
    groupBy = 'month',
    range
  }: {
    filters?: Filter[];
    groupBy?: GroupBy;
    range: DateRange;
  }) {
    let params = this.buildFiltersAsQueryParams({ filters });
    params = params.append('groupBy', groupBy);
    params = params.append('range', range);

    return this.http.get<PortfolioInvestments>(
      '/api/v1/portfolio/investments',
      { params }
    );
  }

  public fetchSymbolItem({
    dataSource,
    includeHistoricalData,
    symbol
  }: {
    dataSource: DataSource | string;
    includeHistoricalData?: number;
    symbol: string;
  }) {
    let params = new HttpParams();

    if (includeHistoricalData) {
      params = params.append('includeHistoricalData', includeHistoricalData);
    }

    return this.http.get<SymbolItem>(`/api/v1/symbol/${dataSource}/${symbol}`, {
      params
    });
  }

  public fetchSymbols({
    includeIndices = false,
    query
  }: {
    includeIndices?: boolean;
    query: string;
  }) {
    let params = new HttpParams().set('query', query);

    if (includeIndices) {
      params = params.append('includeIndices', includeIndices);
    }

    return this.http
      .get<{ items: LookupItem[] }>('/api/v1/symbol/lookup', { params })
      .pipe(
        map((respose) => {
          return respose.items;
        })
      );
  }

  public fetchPortfolioDetails({
    filters,
    withMarkets = false
  }: {
    filters?: Filter[];
    withMarkets?: boolean;
  } = {}): Observable<PortfolioDetails> {
    let params = this.buildFiltersAsQueryParams({ filters });

    if (withMarkets) {
      params = params.append('withMarkets', withMarkets);
    }

    return this.http
      .get<any>('/api/v1/portfolio/details', {
        params
      })
      .pipe(
        map((response) => {
          if (response.summary?.firstOrderDate) {
            response.summary.firstOrderDate = parseISO(
              response.summary.firstOrderDate
            );
          }

          if (response.holdings) {
            for (const symbol of Object.keys(response.holdings)) {
              response.holdings[symbol].assetClassLabel = translate(
                response.holdings[symbol].assetClass
              );

              response.holdings[symbol].assetSubClassLabel = translate(
                response.holdings[symbol].assetSubClass
              );

              response.holdings[symbol].dateOfFirstActivity = response.holdings[
                symbol
              ].dateOfFirstActivity
                ? parseISO(response.holdings[symbol].dateOfFirstActivity)
                : undefined;

              response.holdings[symbol].value = isNumber(
                response.holdings[symbol].value
              )
                ? response.holdings[symbol].value
                : response.holdings[symbol].valueInPercentage;
            }
          }

          return response;
        })
      );
  }

  public fetchPortfolioLookup({ query }: { query: string }) {
    let params = new HttpParams().set('query', query);

    return this.http
      .get<{ items: LookupItem[] }>('/api/v1/portfolio/lookup', {
        params
      })
      .pipe(
        map((response) => {
          return response.items;
        })
      );
  }

  public fetchPortfolioHoldings({
    filters,
    range
  }: {
    filters?: Filter[];
    range?: DateRange;
  }) {
    let params = this.buildFiltersAsQueryParams({ filters });

    if (range) {
      params = params.append('range', range);
    }

    return this.http
      .get<PortfolioHoldingsResponse>('/api/v1/portfolio/holdings', {
        params
      })
      .pipe(
        map((response) => {
          if (response.holdings) {
            for (const symbol of Object.keys(response.holdings)) {
              response.holdings[symbol].assetClassLabel = translate(
                response.holdings[symbol].assetClass
              );

              response.holdings[symbol].assetSubClassLabel = translate(
                response.holdings[symbol].assetSubClass
              );

              response.holdings[symbol].dateOfFirstActivity = response.holdings[
                symbol
              ].dateOfFirstActivity
                ? parseISO(response.holdings[symbol].dateOfFirstActivity)
                : undefined;

              response.holdings[symbol].value = isNumber(
                response.holdings[symbol].value
              )
                ? response.holdings[symbol].value
                : response.holdings[symbol].valueInPercentage;
            }
          }

          return response;
        })
      );
  }

  public fetchPortfolioPerformance({
    filters,
    range,
    withExcludedAccounts = false,
    withItems = false
  }: {
    filters?: Filter[];
    range: DateRange;
    withExcludedAccounts?: boolean;
    withItems?: boolean;
  }): Observable<PortfolioPerformanceResponse> {
    let params = this.buildFiltersAsQueryParams({ filters });
    params = params.append('range', range);

    if (withExcludedAccounts) {
      params = params.append('withExcludedAccounts', withExcludedAccounts);
    }

    if (withItems) {
      params = params.append('withItems', withItems);
    }

    return this.http
      .get<any>(`/api/v2/portfolio/performance`, {
        params
      })
      .pipe(
        map((response) => {
          if (response.firstOrderDate) {
            response.firstOrderDate = parseISO(response.firstOrderDate);
          }

          return response;
        })
      );
  }

  public fetchPortfolioPublic(aId: string) {
    return this.http
      .get<PortfolioPublicDetails>(`/api/v1/portfolio/public/${aId}`)
      .pipe(
        map((response) => {
          if (response.holdings) {
            for (const symbol of Object.keys(response.holdings)) {
              response.holdings[symbol].valueInBaseCurrency = isNumber(
                response.holdings[symbol].valueInBaseCurrency
              )
                ? response.holdings[symbol].valueInBaseCurrency
                : response.holdings[symbol].valueInPercentage;
            }
          }

          return response;
        })
      );
  }

  public fetchPortfolioReport() {
    return this.http.get<PortfolioReport>('/api/v1/portfolio/report');
  }

  public loginAnonymous(accessToken: string) {
    return this.http.post<OAuthResponse>(`/api/v1/auth/anonymous`, {
      accessToken
    });
  }

  public postAccess(aAccess: CreateAccessDto) {
    return this.http.post<OrderModel>(`/api/v1/access`, aAccess);
  }

  public postAccount(aAccount: CreateAccountDto) {
    return this.http.post<OrderModel>(`/api/v1/account`, aAccount);
  }

  public postAccountBalance(aAccountBalance: CreateAccountBalanceDto) {
    return this.http.post<AccountBalance>(
      `/api/v1/account-balance`,
      aAccountBalance
    );
  }

  public postBenchmark(benchmark: UniqueAsset) {
    return this.http.post(`/api/v1/benchmark`, benchmark);
  }

  public postOrder(aOrder: CreateOrderDto) {
    return this.http.post<OrderModel>(`/api/v1/order`, aOrder);
  }

  public postUser() {
    return this.http.post<UserItem>(`/api/v1/user`, {});
  }

  public putAccount(aAccount: UpdateAccountDto) {
    return this.http.put<UserItem>(`/api/v1/account/${aAccount.id}`, aAccount);
  }

  public putAdminSetting(key: string, aData: PropertyDto) {
    return this.http.put<void>(`/api/v1/admin/settings/${key}`, aData);
  }

  public putOrder(aOrder: UpdateOrderDto) {
    return this.http.put<UserItem>(`/api/v1/order/${aOrder.id}`, aOrder);
  }

  public putUserSetting(aData: UpdateUserSettingDto) {
    return this.http.put<User>(`/api/v1/user/setting`, aData);
  }

  public redeemCoupon(couponCode: string) {
    return this.http.post('/api/v1/subscription/redeem-coupon', {
      couponCode
    });
  }

  public transferAccountBalance({
    accountIdFrom,
    accountIdTo,
    balance
  }: TransferBalanceDto) {
    return this.http.post('/api/v1/account/transfer-balance', {
      accountIdFrom,
      accountIdTo,
      balance
    });
  }

  public updateInfo() {
    this.http.get<InfoItem>('/api/v1/info').subscribe((info) => {
      const utmSource = <'ios' | 'trusted-web-activity'>(
        window.localStorage.getItem('utm_source')
      );

      info.globalPermissions = filterGlobalPermissions(
        info.globalPermissions,
        utmSource
      );

      (window as any).info = info;
    });
  }
}
