import { UpdateAssetProfileDto } from '@ghostfolio/api/app/admin/update-asset-profile.dto';
import { UpdateBulkMarketDataDto } from '@ghostfolio/api/app/admin/update-bulk-market-data.dto';
import { CreatePlatformDto } from '@ghostfolio/api/app/platform/create-platform.dto';
import { UpdatePlatformDto } from '@ghostfolio/api/app/platform/update-platform.dto';
import { CreateTagDto } from '@ghostfolio/api/app/tag/create-tag.dto';
import { UpdateTagDto } from '@ghostfolio/api/app/tag/update-tag.dto';
import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  AdminData,
  AdminJobs,
  AdminMarketData,
  AdminMarketDataDetails,
  EnhancedSymbolProfile,
  Filter,
  UniqueAsset
} from '@ghostfolio/common/interfaces';

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';
import { DataSource, MarketData, Platform, Tag } from '@prisma/client';
import { JobStatus } from 'bull';
import { format, parseISO } from 'date-fns';
import { Observable, map } from 'rxjs';

import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  public constructor(
    private dataService: DataService,
    private http: HttpClient
  ) {}

  public addAssetProfile({ dataSource, symbol }: UniqueAsset) {
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

  public deleteProfileData({ dataSource, symbol }: UniqueAsset) {
    return this.http.delete<void>(
      `/api/v1/admin/profile-data/${dataSource}/${symbol}`
    );
  }

  public deleteTag(aId: string) {
    return this.http.delete<void>(`/api/v1/tag/${aId}`);
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

  public fetchAdminMarketDataBySymbol({
    dataSource,
    symbol
  }: {
    dataSource: DataSource;
    symbol: string;
  }): Observable<AdminMarketDataDetails> {
    return this.http
      .get<any>(`/api/v1/admin/market-data/${dataSource}/${symbol}`)
      .pipe(
        map((data) => {
          for (const item of data.marketData) {
            item.date = parseISO(item.date);
          }
          return data;
        })
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

  public fetchTags() {
    return this.http.get<Tag[]>('/api/v1/tag');
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

  public gatherProfileDataBySymbol({ dataSource, symbol }: UniqueAsset) {
    return this.http.post<void>(
      `/api/v1/admin/gather/profile-data/${dataSource}/${symbol}`,
      {}
    );
  }

  public gatherSymbol({
    dataSource,
    date,
    symbol
  }: UniqueAsset & {
    date?: Date;
  }) {
    let url = `/api/v1/admin/gather/${dataSource}/${symbol}`;

    if (date) {
      url = `${url}/${format(date, DATE_FORMAT)}`;
    }

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

  public patchAssetProfile({
    assetClass,
    assetSubClass,
    comment,
    countries,
    currency,
    dataSource,
    name,
    scraperConfiguration,
    sectors,
    symbol,
    symbolMapping
  }: UniqueAsset & UpdateAssetProfileDto) {
    return this.http.patch<EnhancedSymbolProfile>(
      `/api/v1/admin/profile-data/${dataSource}/${symbol}`,
      {
        assetClass,
        assetSubClass,
        comment,
        countries,
        currency,
        name,
        scraperConfiguration,
        sectors,
        symbolMapping
      }
    );
  }

  public postMarketData({
    dataSource,
    marketData,
    symbol
  }: {
    dataSource: DataSource;
    marketData: UpdateBulkMarketDataDto;
    symbol: string;
  }) {
    const url = `/api/v1/admin/market-data/${dataSource}/${symbol}`;

    return this.http.post<MarketData>(url, marketData);
  }

  public postPlatform(aPlatform: CreatePlatformDto) {
    return this.http.post<Platform>(`/api/v1/platform`, aPlatform);
  }

  public postTag(aTag: CreateTagDto) {
    return this.http.post<Tag>(`/api/v1/tag`, aTag);
  }

  public putPlatform(aPlatform: UpdatePlatformDto) {
    return this.http.put<Platform>(
      `/api/v1/platform/${aPlatform.id}`,
      aPlatform
    );
  }

  public putTag(aTag: UpdateTagDto) {
    return this.http.put<Tag>(`/api/v1/tag/${aTag.id}`, aTag);
  }

  public testMarketData({
    dataSource,
    scraperConfiguration,
    symbol
  }: UniqueAsset & UpdateAssetProfileDto['scraperConfiguration']) {
    return this.http.post<any>(
      `/api/v1/admin/market-data/${dataSource}/${symbol}/test`,
      {
        scraperConfiguration
      }
    );
  }
}
