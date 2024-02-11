import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import { parseSymbol } from '@ghostfolio/common/helper';

import { Injectable } from '@nestjs/common';
import { SymbolProfile } from '@prisma/client';
import got, { Headers } from 'got';

@Injectable()
export class OpenFigiDataEnhancerService implements DataEnhancerInterface {
  private static baseUrl = 'https://api.openfigi.com';

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public async enhance({
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    response,
    symbol
  }: {
    requestTimeout?: number;
    response: Partial<SymbolProfile>;
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    if (
      !(
        response.assetClass === 'EQUITY' &&
        (response.assetSubClass === 'ETF' || response.assetSubClass === 'STOCK')
      )
    ) {
      return response;
    }

    const headers: Headers = {};
    const { exchange, ticker } = parseSymbol({
      symbol,
      dataSource: response.dataSource
    });

    if (this.configurationService.get('API_KEY_OPEN_FIGI')) {
      headers['X-OPENFIGI-APIKEY'] =
        this.configurationService.get('API_KEY_OPEN_FIGI');
    }

    let abortController = new AbortController();

    setTimeout(() => {
      abortController.abort();
    }, requestTimeout);

    const mappings = await got
      .post(`${OpenFigiDataEnhancerService.baseUrl}/v3/mapping`, {
        headers,
        json: [{ exchCode: exchange, idType: 'TICKER', idValue: ticker }],
        // @ts-ignore
        signal: abortController.signal
      })
      .json<any[]>();

    if (mappings?.length === 1 && mappings[0].data?.length === 1) {
      const { compositeFIGI, figi, shareClassFIGI } = mappings[0].data[0];

      if (figi) {
        response.figi = figi;
      }

      if (compositeFIGI) {
        response.figiComposite = compositeFIGI;
      }

      if (shareClassFIGI) {
        response.figiShareClass = shareClassFIGI;
      }
    }

    return response;
  }

  public getName() {
    return 'OPENFIGI';
  }

  public getTestSymbol() {
    return undefined;
  }
}
