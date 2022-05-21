import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UpdateMarketDataDto } from '@ghostfolio/api/app/admin/update-market-data.dto';
import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  AdminMarketDataDetails,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import { DataSource, MarketData } from '@prisma/client';
import { format, parseISO } from 'date-fns';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  public constructor(private http: HttpClient) {}

  public deleteProfileData({ dataSource, symbol }: UniqueAsset) {
    return this.http.delete<void>(
      `/api/v1/admin/profile-data/${dataSource}/${symbol}`
    );
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

  public gatherMax() {
    return this.http.post<void>(`/api/v1/admin/gather/max`, {});
  }

  public gatherProfileData() {
    return this.http.post<void>(`/api/v1/admin/gather/profile-data`, {});
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
    date,
    symbol
  }: {
    dataSource: DataSource;
    date: Date;
    symbol: string;
  }) {
    const url = `/api/v1/symbol/${dataSource}/${symbol}/${format(
      date,
      DATE_FORMAT
    )}`;

    return this.http.get<IDataProviderHistoricalResponse>(url);
  }

  public putMarketData({
    dataSource,
    date,
    marketData,
    symbol
  }: {
    dataSource: DataSource;
    date: Date;
    marketData: UpdateMarketDataDto;
    symbol: string;
  }) {
    const url = `/api/v1/admin/market-data/${dataSource}/${symbol}/${format(
      date,
      DATE_FORMAT
    )}`;

    return this.http.put<MarketData>(url, marketData);
  }
}
