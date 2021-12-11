import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
}
