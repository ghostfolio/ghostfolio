import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import { parseSymbol } from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { SymbolProfile } from '@prisma/client';
import OpenFIGI from 'openfigi';

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

    const { exchange, ticker } = parseSymbol({
      symbol,
      dataSource: response.dataSource
    });

    const openfigi = new OpenFIGI({
      apiKey: this.configurationService.get('API_KEY_OPEN_FIGI') || undefined
    });

    try {
      const mappings = await openfigi.mapping(
        [
          {
            idType: 'TICKER',
            idValue: ticker,
            exchCode: exchange
          }
        ],
        {
          fetchOptions: {
            signal: AbortSignal.timeout(requestTimeout ?? 5000)
          }
        }
      );

      if (mappings?.length === 1 && mappings[0].data?.length === 1) {
        const { compositeFIGI, figi, shareClassFIGI } = mappings[0].data[0];

        if (figi) response.figi = figi;
        if (compositeFIGI) response.figiComposite = compositeFIGI;
        if (shareClassFIGI) response.figiShareClass = shareClassFIGI;
      }
    } catch (error) {
      console.error('OpenFIGI mapping failed:', error);
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
