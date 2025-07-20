import { Injectable } from '@angular/core';
import { DataSource } from '@prisma/client';

@Injectable({
  providedIn: 'root'
})
export class EntityLogoImageSourceService {
  public getLogoUrlByDataSourceAndSymbol(
    dataSource: DataSource,
    symbol: string
  ) {
    return `../api/v1/logo/${dataSource}/${symbol}`;
  }

  public getLogoUrlByUrl(url: string) {
    return `../api/v1/logo?url=${url}`;
  }
}
