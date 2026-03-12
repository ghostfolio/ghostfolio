import {
  DEFAULT_PAGE_SIZE,
  HEADER_KEY_SKIP_INTERCEPTOR,
  HEADER_KEY_TOKEN
} from '@ghostfolio/common/config';
import {
  CreatePlatformDto,
  UpdateAssetProfileDto,
  UpdatePlatformDto
} from '@ghostfolio/common/dtos';
import {
  AdminData,
  AdminJobs,
  AdminMarketData,
  AdminUserResponse,
  AdminUsersResponse,
  AssetProfileIdentifier,
  DataProviderGhostfolioStatusResponse,
  DataProviderHistoricalResponse,
  EnhancedSymbolProfile,
  Filter
} from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';
import { GF_ENVIRONMENT, GfEnvironment } from '@ghostfolio/ui/environment';
import { DataService } from '@ghostfolio/ui/services';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';
import { DataSource, MarketData, Platform } from '@prisma/client';
import { JobStatus } from 'bull';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  public constructor(
    private dataService: DataService,
    @Inject(GF_ENVIRONMENT) private environment: GfEnvironment,
    private http: HttpClient
  ) {}

  public addAssetProfile({ dataSource, symbol }: AssetProfileIdentifier) {
    return this.http.post<void>(
      `/api/v1/admin/profile-data/${dataSource}/${symbol}`,
      null
    );
  }

  public deleteJob(aId: string) {
    return this.http.delete<void>(`/api/v1/admin/queue/job/${aId}`);
  }

  public deleteJobs({ status }: { status: JobStatus[] }) {
    let params = new HttpParams();

    if (status?.length > 0) {
      params = params.append('status', status.join(','));
    }

    return this.http.delete<void>('/api/v1/admin/queue/job', {
      params
    });
  }

  public deletePlatform(aId: string) {
    return this.http.delete<void>(`/api/v1/platform/${aId}`);
  }

  public deleteProfileData({ dataSource, symbol }: AssetProfileIdentifier) {
    return this.http.delete<void>(
      `/api/v1/admin/profile-data/${dataSource}/${symbol}`
    );
  }

  public executeJob(aId: string) {
    return this.http.get<void>(`/api/v1/admin/queue/job/${aId}/execute`);
  }

  public fetchAdminData() {
    return this.http.get<AdminData>('/api/v1/admin');
  }

  public fetchAdminMarketData({
    filters,
    skip,
    sortColumn,
    sortDirection,
    take
  }: {
    filters?: Filter[];
    skip?: number;
    sortColumn?: string;
    sortDirection?: SortDirection;
    take: number;
  }) {
    let params = this.dataService.buildFiltersAsQueryParams({ filters });

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

    return this.http.get<AdminMarketData>('/api/v1/admin/market-data', {
      params
    });
  }

  public fetchGhostfolioDataProviderStatus(aApiKey: string) {
    const headers = new HttpHeaders({
      [HEADER_KEY_SKIP_INTERCEPTOR]: 'true',
      [HEADER_KEY_TOKEN]: `Api-Key ${aApiKey}`
    });

    return this.http.get<DataProviderGhostfolioStatusResponse>(
      `${this.environment.production ? 'https://ghostfol.io' : ''}/api/v2/data-providers/ghostfolio/status`,
      { headers }
    );
  }

  public fetchJobs({ status }: { status?: JobStatus[] }) {
    let params = new HttpParams();

    if (status?.length > 0) {
      params = params.append('status', status.join(','));
    }

    return this.http.get<AdminJobs>('/api/v1/admin/queue/job', {
      params
    });
  }

  public fetchPlatforms() {
    return this.http.get<Platform[]>('/api/v1/platform');
  }

  public fetchUserById(id: string) {
    return this.http.get<AdminUserResponse>(`/api/v1/admin/user/${id}`);
  }

  public fetchUsers({
    skip,
    take = DEFAULT_PAGE_SIZE
  }: {
    skip?: number;
    take?: number;
  }) {
    let params = new HttpParams();

    params = params.append('skip', skip);
    params = params.append('take', take);

    return this.http.get<AdminUsersResponse>('/api/v1/admin/user', { params });
  }

  public gather7Days() {
    return this.http.post<void>('/api/v1/admin/gather', {});
  }

  public gatherMax() {
    return this.http.post<void>('/api/v1/admin/gather/max', {});
  }

  public gatherProfileData() {
    return this.http.post<void>('/api/v1/admin/gather/profile-data', {});
  }

  public gatherProfileDataBySymbol({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    return this.http.post<void>(
      `/api/v1/admin/gather/profile-data/${dataSource}/${symbol}`,
      {}
    );
  }

  public gatherSymbol({
    dataSource,
    range,
    symbol
  }: {
    range?: DateRange;
  } & AssetProfileIdentifier) {
    let params = new HttpParams();

    if (range) {
      params = params.append('range', range);
    }

    const url = `/api/v1/admin/gather/${dataSource}/${symbol}`;

    return this.http.post<MarketData | void>(url, undefined, { params });
  }

  public fetchSymbolForDate({
    dataSource,
    dateString,
    symbol
  }: {
    dataSource: DataSource;
    dateString: string;
    symbol: string;
  }) {
    const url = `/api/v1/symbol/${dataSource}/${symbol}/${dateString}`;

    return this.http.get<DataProviderHistoricalResponse>(url);
  }

  public patchAssetProfile(
    { dataSource, symbol }: AssetProfileIdentifier,
    {
      assetClass,
      assetSubClass,
      comment,
      countries,
      currency,
      dataSource: newDataSource,
      isActive,
      name,
      scraperConfiguration,
      sectors,
      symbol: newSymbol,
      symbolMapping,
      url
    }: UpdateAssetProfileDto
  ) {
    return this.http.patch<EnhancedSymbolProfile>(
      `/api/v1/admin/profile-data/${dataSource}/${symbol}`,
      {
        assetClass,
        assetSubClass,
        comment,
        countries,
        currency,
        dataSource: newDataSource,
        isActive,
        name,
        scraperConfiguration,
        sectors,
        symbol: newSymbol,
        symbolMapping,
        url
      }
    );
  }

  public postPlatform(aPlatform: CreatePlatformDto) {
    return this.http.post<Platform>(`/api/v1/platform`, aPlatform);
  }

  public putPlatform(aPlatform: UpdatePlatformDto) {
    return this.http.put<Platform>(
      `/api/v1/platform/${aPlatform.id}`,
      aPlatform
    );
  }

  public syncDemoUserAccount() {
    return this.http.get<void>(`/api/v1/admin/demo-user/sync`);
  }

  public testMarketData({
    dataSource,
    scraperConfiguration,
    symbol
  }: AssetProfileIdentifier & UpdateAssetProfileDto['scraperConfiguration']) {
    return this.http.post<{ price: number }>(
      `/api/v1/admin/market-data/${dataSource}/${symbol}/test`,
      {
        scraperConfiguration
      }
    );
  }
}
