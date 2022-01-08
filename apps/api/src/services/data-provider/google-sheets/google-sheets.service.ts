import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse,
  MarketState
} from '@ghostfolio/api/services/interfaces/interfaces';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { format } from 'date-fns';
import { GoogleSpreadsheet } from 'google-spreadsheet';

@Injectable()
export class GoogleSheetsService implements DataProviderInterface {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly prismaService: PrismaService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public canHandle(symbol: string) {
    return true;
  }

  public async get(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const [symbol] = aSymbols;
      const [symbolProfile] = await this.symbolProfileService.getSymbolProfiles(
        [symbol]
      );

      const sheet = await this.getSheet({
        sheetId: this.configurationService.get('GOOGLE_SHEETS_ID'),
        symbol
      });
      const marketPrice = parseFloat(
        (await sheet.getCellByA1('B1').value) as string
      );

      return {
        [symbol]: {
          marketPrice,
          currency: symbolProfile?.currency,
          dataSource: this.getName(),
          marketState: MarketState.delayed
        }
      };
    } catch (error) {
      Logger.error(error);
    }

    return {};
  }

  public async getHistorical(
    aSymbols: string[],
    aGranularity: Granularity = 'day',
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const [symbol] = aSymbols;

      const sheet = await this.getSheet({
        symbol,
        sheetId: this.configurationService.get('GOOGLE_SHEETS_ID')
      });

      const rows = await sheet.getRows();

      const historicalData: {
        [date: string]: IDataProviderHistoricalResponse;
      } = {};

      rows
        .filter((row, index) => {
          return index >= 1;
        })
        .forEach((row) => {
          const date = new Date(row._rawData[0]);
          const close = parseFloat(row._rawData[1]);

          historicalData[format(date, DATE_FORMAT)] = { marketPrice: close };
        });

      return {
        [symbol]: historicalData
      };
    } catch (error) {
      Logger.error(error);
    }

    return {};
  }

  public getName(): DataSource {
    return DataSource.GOOGLE_SHEETS;
  }

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
    const items = await this.prismaService.symbolProfile.findMany({
      select: {
        currency: true,
        dataSource: true,
        name: true,
        symbol: true
      },
      where: {
        OR: [
          {
            dataSource: this.getName(),
            name: {
              mode: 'insensitive',
              startsWith: aQuery
            }
          },
          {
            dataSource: this.getName(),
            symbol: {
              mode: 'insensitive',
              startsWith: aQuery
            }
          }
        ]
      }
    });

    return { items };
  }

  private async getSheet({
    sheetId,
    symbol
  }: {
    sheetId: string;
    symbol: string;
  }) {
    const doc = new GoogleSpreadsheet(sheetId);

    await doc.useServiceAccountAuth({
      client_email: this.configurationService.get('GOOGLE_SHEETS_ACCOUNT'),
      private_key: this.configurationService
        .get('GOOGLE_SHEETS_PRIVATE_KEY')
        .replace(/\\n/g, '\n')
    });

    await doc.loadInfo();

    const sheet = doc.sheetsByTitle[symbol];

    await sheet.loadCells();

    return sheet;
  }
}
