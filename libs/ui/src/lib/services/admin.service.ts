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
  AdminUserResponse,
  AdminUsersResponse,
  AssetProfileIdentifier,
  DataProviderGhostfolioStatusResponse,
  DataProviderHistoricalResponse,
  EnhancedSymbolProfile
} from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';
import { GF_ENVIRONMENT } from '@ghostfolio/ui/environment';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MarketData, Platform } from '@prisma/client';
import { JobStatus } from 'bull';
import { isNumber } from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly environment = inject(GF_ENVIRONMENT);
  private readonly http = inject(HttpClient);

  public addAssetProfile({ dataSource, symbol }: AssetProfileIdentifier) {
    return this.http.post<void>(
      `/api/v1/admin/profile-data/${dataSource}/${encodeURIComponent(symbol)}`,
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
      `/api/v1/admin/profile-data/${dataSource}/${encodeURIComponent(symbol)}`
    );
  }

  public executeJob(aId: string) {
    return this.http.get<void>(`/api/v1/admin/queue/job/${aId}/execute`);
  }

  public fetchAdminData() {
    return this.http.get<AdminData>('/api/v1/admin');
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

    if (status && status.length > 0) {
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

    if (isNumber(skip)) {
      params = params.append('skip', skip);
    }

    if (isNumber(take)) {
      params = params.append('take', take);
    }

    return this.http.get<AdminUsersResponse>('/api/v1/admin/user', { params });
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
      `/api/v1/admin/gather/profile-data/${dataSource}/${encodeURIComponent(symbol)}`,
      {}
    );
  }

  public gatherRecentMarketData() {
    return this.http.post<void>('/api/v1/admin/gather', {});
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

    const url = `/api/v1/admin/gather/${dataSource}/${encodeURIComponent(symbol)}`;

    return this.http.post<MarketData | void>(url, undefined, { params });
  }

  public fetchSymbolForDate({
    dataSource,
    dateString,
    symbol
  }: { dateString: string } & AssetProfileIdentifier) {
    const url = `/api/v1/symbol/${dataSource}/${encodeURIComponent(symbol)}/${dateString}`;

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
      dataGatheringFrequency,
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
      `/api/v1/admin/profile-data/${dataSource}/${encodeURIComponent(symbol)}`,
      {
        assetClass,
        assetSubClass,
        comment,
        countries,
        currency,
        dataGatheringFrequency,
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
      `/api/v1/admin/market-data/${dataSource}/${encodeURIComponent(symbol)}/test`,
      {
        scraperConfiguration
      }
    );
  }
}
