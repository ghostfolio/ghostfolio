import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { CreateAccountDto } from '@ghostfolio/api/app/account/create-account.dto';
import { UpdateAccountDto } from '@ghostfolio/api/app/account/update-account.dto';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Activities } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { PortfolioPositionDetail } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-position-detail.interface';
import { PortfolioPositions } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-positions.interface';
import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { SymbolItem } from '@ghostfolio/api/app/symbol/interfaces/symbol-item.interface';
import { UserItem } from '@ghostfolio/api/app/user/interfaces/user-item.interface';
import { UpdateUserSettingDto } from '@ghostfolio/api/app/user/update-user-setting.dto';
import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';
import { PropertyDto } from '@ghostfolio/api/services/property/property.dto';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  Access,
  Accounts,
  AdminData,
  AdminMarketData,
  BenchmarkMarketDataDetails,
  BenchmarkResponse,
  Export,
  Filter,
  ImportResponse,
  InfoItem,
  OAuthResponse,
  PortfolioDetails,
  PortfolioDividends,
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
import { DataSource, Order as OrderModel } from '@prisma/client';
import { format, parseISO } from 'date-fns';
import { cloneDeep, groupBy } from 'lodash';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  public constructor(private http: HttpClient) {}

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

  public fetchAccounts() {
    return this.http.get<Accounts>('/api/v1/account');
  }

  public fetchActivities({
    filters
  }: {
    filters?: Filter[];
  }): Observable<Activities> {
    return this.http
      .get<any>('/api/v1/order', {
        params: this.buildFiltersAsQueryParams({ filters })
      })
      .pipe(
        map(({ activities }) => {
          for (const activity of activities) {
            activity.createdAt = parseISO(activity.createdAt);
            activity.date = parseISO(activity.date);
          }
          return { activities };
        })
      );
  }

  public fetchAdminData() {
    return this.http.get<AdminData>('/api/v1/admin');
  }

  public fetchAdminMarketData({ filters }: { filters?: Filter[] }) {
    return this.http.get<AdminMarketData>('/api/v1/admin/market-data', {
      params: this.buildFiltersAsQueryParams({ filters })
    });
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

  public deleteOrder(aId: string) {
    return this.http.delete<any>(`/api/v1/order/${aId}`);
  }

  public deleteUser(aId: string) {
    return this.http.delete<any>(`/api/v1/user/${aId}`);
  }

  public fetchAccesses() {
    return this.http.get<Access[]>('/api/v1/access');
  }

  public fetchBenchmarkBySymbol({
    dataSource,
    startDate,
    symbol
  }: {
    startDate: Date;
  } & UniqueAsset): Observable<BenchmarkMarketDataDetails> {
    return this.http.get<BenchmarkMarketDataDetails>(
      `/api/v1/benchmark/${dataSource}/${symbol}/${format(
        startDate,
        DATE_FORMAT
      )}`
    );
  }

  public fetchBenchmarks() {
    return this.http.get<BenchmarkResponse>('/api/v1/benchmark');
  }

  public fetchExport(activityIds?: string[]) {
    let params = new HttpParams();

    if (activityIds) {
      params = params.append('activityIds', activityIds.join(','));
    }

    return this.http.get<Export>('/api/v1/export', {
      params
    });
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

  public fetchPositions({
    filters,
    range
  }: {
    filters?: Filter[];
    range: DateRange;
  }): Observable<PortfolioPositions> {
    let params = this.buildFiltersAsQueryParams({ filters });
    params = params.append('range', range);

    return this.http.get<PortfolioPositions>('/api/v1/portfolio/positions', {
      params
    });
  }

  public fetchSymbols(aQuery: string) {
    return this.http
      .get<{ items: LookupItem[] }>(`/api/v1/symbol/lookup?query=${aQuery}`)
      .pipe(
        map((respose) => {
          return respose.items;
        })
      );
  }

  public fetchPortfolioDetails({
    filters
  }: {
    filters?: Filter[];
  }): Observable<PortfolioDetails> {
    return this.http
      .get<any>('/api/v1/portfolio/details', {
        params: this.buildFiltersAsQueryParams({ filters })
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
              response.holdings[symbol].assetClass = translate(
                response.holdings[symbol].assetClass
              );

              response.holdings[symbol].assetSubClass = translate(
                response.holdings[symbol].assetSubClass
              );

              response.holdings[symbol].dateOfFirstActivity = response.holdings[
                symbol
              ].dateOfFirstActivity
                ? parseISO(response.holdings[symbol].dateOfFirstActivity)
                : undefined;
            }
          }

          return response;
        })
      );
  }

  public fetchPortfolioPerformance({
    filters,
    range
  }: {
    filters?: Filter[];
    range: DateRange;
  }): Observable<PortfolioPerformanceResponse> {
    let params = this.buildFiltersAsQueryParams({ filters });
    params = params.append('range', range);

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
    return this.http.get<PortfolioPublicDetails>(
      `/api/v1/portfolio/public/${aId}`
    );
  }

  public fetchPortfolioReport() {
    return this.http.get<PortfolioReport>('/api/v1/portfolio/report');
  }

  public fetchPositionDetail({
    dataSource,
    symbol
  }: {
    dataSource: DataSource;
    symbol: string;
  }) {
    return this.http
      .get<PortfolioPositionDetail>(
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

  public loginAnonymous(accessToken: string) {
    return this.http.get<OAuthResponse>(
      `/api/v1/auth/anonymous/${accessToken}`
    );
  }

  public postAccess(aAccess: CreateAccessDto) {
    return this.http.post<OrderModel>(`/api/v1/access`, aAccess);
  }

  public postAccount(aAccount: CreateAccountDto) {
    return this.http.post<OrderModel>(`/api/v1/account`, aAccount);
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

  private buildFiltersAsQueryParams({ filters }: { filters?: Filter[] }) {
    let params = new HttpParams();

    if (filters?.length > 0) {
      const {
        ACCOUNT: filtersByAccount,
        ASSET_CLASS: filtersByAssetClass,
        ASSET_SUB_CLASS: filtersByAssetSubClass,
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
}
