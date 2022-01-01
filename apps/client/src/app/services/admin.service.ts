import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UpdateMarketDataDto } from '@ghostfolio/api/app/admin/update-market-data.dto';
import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { DataSource, MarketData } from '@prisma/client';
import { format } from 'date-fns';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  public constructor(private http: HttpClient) {}

  public gatherMax() {
    return this.http.post<void>(`/api/admin/gather/max`, {});
  }

  public gatherProfileData() {
    return this.http.post<void>(`/api/admin/gather/profile-data`, {});
  }

  public gatherProfileDataBySymbol({
    dataSource,
    symbol
  }: {
    dataSource: DataSource;
    symbol: string;
  }) {
    return this.http.post<void>(
      `/api/admin/gather/profile-data/${dataSource}/${symbol}`,
      {}
    );
  }

  public gatherSymbol({
    dataSource,
    date,
    symbol
  }: {
    dataSource: DataSource;
    date?: Date;
    symbol: string;
  }) {
    let url = `/api/admin/gather/${dataSource}/${symbol}`;

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
    const url = `/api/symbol/${dataSource}/${symbol}/${format(
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
    const url = `/api/admin/market-data/${dataSource}/${symbol}/${format(
      date,
      DATE_FORMAT
    )}`;

    return this.http.put<MarketData>(url, marketData);
  }
}
