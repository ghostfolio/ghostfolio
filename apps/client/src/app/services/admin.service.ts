import { UpdateAssetProfileDto } from '@ghostfolio/api/app/admin/update-asset-profile.dto';
import { CreatePlatformDto } from '@ghostfolio/api/app/platform/create-platform.dto';
import { UpdatePlatformDto } from '@ghostfolio/api/app/platform/update-platform.dto';
import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';
import {
  HEADER_KEY_SKIP_INTERCEPTOR,
  HEADER_KEY_TOKEN
} from '@ghostfolio/common/config';
import { DEFAULT_PAGE_SIZE } from '@ghostfolio/common/config';
import {
  AssetProfileIdentifier,
  AdminData,
  AdminJobs,
  AdminMarketData,
  AdminUsers,
  DataProviderGhostfolioStatusResponse,
  EnhancedSymbolProfile,
  Filter
} from '@ghostfolio/common/interfaces';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';
import { DataSource, MarketData, Platform } from '@prisma/client';
import { JobStatus } from 'bull';

import { environment } from '../../environments/environment';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  public constructor(
    private dataService: DataService,
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
      `${environment.production ? 'https://ghostfol.io' : ''}/api/v2/data-providers/ghostfolio/status`,
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

    return this.http.get<AdminUsers>('/api/v1/admin/user', { params });
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

  public gatherSymbol({ dataSource, symbol }: AssetProfileIdentifier) {
    const url = `/api/v1/admin/gather/${dataSource}/${symbol}`;
    return this.http.post<MarketData | void>(url, {});
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

    return this.http.get<IDataProviderHistoricalResponse>(url);
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
    return this.http.post<any>(
      `/api/v1/admin/market-data/${dataSource}/${symbol}/test`,
      {
        scraperConfiguration
      }
    );
  }
}
