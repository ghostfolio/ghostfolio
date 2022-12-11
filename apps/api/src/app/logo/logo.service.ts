import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import { HttpException, Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import * as bent from 'bent';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Injectable()
export class LogoService {
  public constructor(
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async getLogoByDataSourceAndSymbol({
    dataSource,
    symbol
  }: UniqueAsset) {
    if (!DataSource[dataSource]) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const [assetProfile] = await this.symbolProfileService.getSymbolProfiles([
      { dataSource, symbol }
    ]);

    if (!assetProfile) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return this.getBuffer(assetProfile.url);
  }

  public async getLogoByUrl(aUrl: string) {
    return this.getBuffer(aUrl);
  }

  private getBuffer(aUrl: string) {
    const get = bent(
      `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${aUrl}&size=64`,
      'GET',
      'buffer',
      200,
      {
        'User-Agent': 'request'
      }
    );
    return get();
  }
}
