import { Injectable } from '@nestjs/common';
import * as bent from 'bent';
import { format, subMonths, subWeeks, subYears } from 'date-fns';
import { getToday, getYesterday } from 'libs/helper/src';

import { DataProviderInterface } from '../../interfaces/data-provider.interface';
import { Granularity } from '../../interfaces/granularity.type';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '../../interfaces/interfaces';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class RakutenRapidApiService implements DataProviderInterface {
  public static FEAR_AND_GREED_INDEX_NAME = 'Fear & Greed Index';

  private prisma: PrismaService;

  public constructor() {}

  public async get(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const symbol = aSymbols[0];

      if (symbol === 'GF.FEAR_AND_GREED_INDEX') {
        const fgi = await this.getFearAndGreedIndex();

        return {
          'GF.FEAR_AND_GREED_INDEX': {
            currency: undefined,
            isMarketOpen: true,
            marketPrice: fgi.now.value,
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

      if (symbol === 'GF.FEAR_AND_GREED_INDEX') {
        const fgi = await this.getFearAndGreedIndex();

        try {
          // Rebuild historical data
          // TODO: can be removed after all data from the last year has been gathered
          // (introduced on 27.03.2021)

          await this.prisma.marketData.create({
            data: {
              symbol,
              date: subWeeks(getToday(), 1),
              marketPrice: fgi.oneWeekAgo.value
            }
          });

          await this.prisma.marketData.create({
            data: {
              symbol,
              date: subMonths(getToday(), 1),
              marketPrice: fgi.oneMonthAgo.value
            }
          });

          await this.prisma.marketData.create({
            data: {
              symbol,
              date: subYears(getToday(), 1),
              marketPrice: fgi.oneYearAgo.value
            }
          });

          ///////////////////////////////////////////////////////////////////////////
        } catch {}

        return {
          'GF.FEAR_AND_GREED_INDEX': {
            [format(getYesterday(), 'yyyy-MM-dd')]: {
              marketPrice: fgi.previousClose.value
            }
          }
        };
      }
    } catch (error) {}

    return {};
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
          'x-rapidapi-key': process.env.RAKUTEN_RAPID_API_KEY
        }
      );

      const { fgi } = await get();
      return fgi;
    } catch (error) {
      console.error(error);

      return undefined;
    }
  }

  public setPrisma(aPrismaService: PrismaService) {
    this.prisma = aPrismaService;
  }
}
