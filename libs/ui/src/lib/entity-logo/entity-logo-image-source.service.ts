import { Injectable } from '@angular/core';
import { DataSource } from '@prisma/client';

@Injectable({
  providedIn: 'root'
})
export class EntityLogoImageSourceService {
  public getLogoSourceByDataSourceAndSymbol(
    dataSource: DataSource,
    symbol: string
  ): string {
    return `../api/v1/logo/${dataSource}/${symbol}`;
  }

  public getLogoSourceByUrl(url: string): string {
    return `..//api/v1/logo?url=${url}`;
  }
}
