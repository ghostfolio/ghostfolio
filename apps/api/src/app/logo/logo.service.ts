import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { UniqueAsset } from '@ghostfolio/common/interfaces';

import { HttpException, Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import got from 'got';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Injectable()
export class LogoService {
  public constructor(
    private readonly configurationService: ConfigurationService,
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
    const abortController = new AbortController();

    setTimeout(() => {
      abortController.abort();
    }, this.configurationService.get('REQUEST_TIMEOUT'));

    return got(
      `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${aUrl}&size=64`,
      {
        headers: { 'User-Agent': 'request' },
        // @ts-ignore
        signal: abortController.signal
      }
    ).buffer();
  }
}
