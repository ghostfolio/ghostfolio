import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { HttpException, Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';
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
  }: AssetProfileIdentifier) {
    if (!DataSource[dataSource]) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const [assetProfile] = await this.symbolProfileService.getSymbolProfiles([
      { dataSource, symbol }
    ]);

    if (!assetProfile?.url) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return this.getBuffer(assetProfile.url);
  }

  public getLogoByUrl(aUrl: string) {
    return this.getBuffer(aUrl);
  }

  private async getBuffer(aUrl: string) {
    const blob = await fetch(
      `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${aUrl}&size=64`,
      {
        headers: { 'User-Agent': 'request' },
        signal: AbortSignal.timeout(
          this.configurationService.get('REQUEST_TIMEOUT')
        )
      }
    ).then((res) => res.blob());

    return {
      buffer: await blob.arrayBuffer().then((arrayBuffer) => {
        return Buffer.from(arrayBuffer);
      }),
      type: blob.type
    };
  }
}
