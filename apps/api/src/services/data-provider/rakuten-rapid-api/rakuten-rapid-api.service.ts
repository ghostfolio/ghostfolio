import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { ghostfolioFearAndGreedIndexSymbol } from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  getToday,
  getYesterday,
  isRakutenRapidApiSymbol
} from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import * as bent from 'bent';
import { format, subMonths, subWeeks, subYears } from 'date-fns';

import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse,
  MarketState
} from '../../interfaces/interfaces';
import { DataProviderInterface } from '../interfaces/data-provider.interface';

@Injectable()
export class RakutenRapidApiService implements DataProviderInterface {
  public static FEAR_AND_GREED_INDEX_NAME = 'Fear & Greed Index';

  private prismaService: PrismaService;

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public canHandle(symbol: string) {
    return (
      isRakutenRapidApiSymbol(symbol) &&
      !!this.configurationService.get('RAKUTEN_RAPID_API_KEY')
    );
  }

  public async get(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const symbol = aSymbols[0];

      if (symbol === ghostfolioFearAndGreedIndexSymbol) {
        const fgi = await this.getFearAndGreedIndex();

        return {
          [ghostfolioFearAndGreedIndexSymbol]: {
            currency: undefined,
            dataSource: DataSource.RAKUTEN,
            marketPrice: fgi.now.value,
            marketState: MarketState.open,
            name: RakutenRapidApiService.FEAR_AND_GREED_INDEX_NAME
          }
        };
      }
    } catch (error) {
      console.error(error);
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
      const symbol = aSymbols[0];

      if (symbol === ghostfolioFearAndGreedIndexSymbol) {
        const fgi = await this.getFearAndGreedIndex();

        try {
          // Rebuild historical data
          // TODO: can be removed after all data from the last year has been gathered
          // (introduced on 27.03.2021)

          await this.prismaService.marketData.create({
            data: {
              symbol,
              dataSource: DataSource.RAKUTEN,
              date: subWeeks(getToday(), 1),
              marketPrice: fgi.oneWeekAgo.value
            }
          });

          await this.prismaService.marketData.create({
            data: {
              symbol,
              dataSource: DataSource.RAKUTEN,
              date: subMonths(getToday(), 1),
              marketPrice: fgi.oneMonthAgo.value
            }
          });

          await this.prismaService.marketData.create({
            data: {
              symbol,
              dataSource: DataSource.RAKUTEN,
              date: subYears(getToday(), 1),
              marketPrice: fgi.oneYearAgo.value
            }
          });

          ///////////////////////////////////////////////////////////////////////////
        } catch {}

        return {
          [ghostfolioFearAndGreedIndexSymbol]: {
            [format(getYesterday(), DATE_FORMAT)]: {
              marketPrice: fgi.previousClose.value
            }
          }
        };
      }
    } catch (error) {}

    return {};
  }

  public async search(aSymbol: string): Promise<{ items: LookupItem[] }> {
    return { items: [] };
  }

  public setPrisma(aPrismaService: PrismaService) {
    this.prismaService = aPrismaService;
  }

  private async getFearAndGreedIndex(): Promise<{
    now: { value: number; valueText: string };
    previousClose: { value: number; valueText: string };
    oneWeekAgo: { value: number; valueText: string };
    oneMonthAgo: { value: number; valueText: string };
    oneYearAgo: { value: number; valueText: string };
  }> {
    try {
      const get = bent(
        `https://fear-and-greed-index.p.rapidapi.com/v1/fgi`,
        'GET',
        'json',
        200,
        {
          useQueryString: true,
          'x-rapidapi-host': 'fear-and-greed-index.p.rapidapi.com',
          'x-rapidapi-key': this.configurationService.get(
            'RAKUTEN_RAPID_API_KEY'
          )
        }
      );

      const { fgi } = await get();
      return fgi;
    } catch (error) {
      console.error(error);

      return undefined;
    }
  }
}
