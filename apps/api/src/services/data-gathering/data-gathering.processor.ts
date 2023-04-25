import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import {
  DATA_GATHERING_QUEUE,
  GATHER_ASSET_PROFILE_PROCESS,
  GATHER_HISTORICAL_MARKET_DATA_PROCESS
} from '@ghostfolio/common/config';
import { DATE_FORMAT, getStartOfUtcDate } from '@ghostfolio/common/helper';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  format,
  getDate,
  getMonth,
  getYear,
  isBefore,
  parseISO
} from 'date-fns';

import { DataGatheringService } from './data-gathering.service';

@Injectable()
@Processor(DATA_GATHERING_QUEUE)
export class DataGatheringProcessor {
  public constructor(
    private readonly dataGatheringService: DataGatheringService,
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService
  ) {}

  @Process(GATHER_ASSET_PROFILE_PROCESS)
  public async gatherAssetProfile(job: Job<UniqueAsset>) {
    try {
      await this.dataGatheringService.gatherAssetProfiles([job.data]);
    } catch (error) {
      Logger.error(
        error,
        `DataGatheringProcessor (${GATHER_ASSET_PROFILE_PROCESS})`
      );

      throw new Error(error);
    }
  }

  @Process(GATHER_HISTORICAL_MARKET_DATA_PROCESS)
  public async gatherHistoricalMarketData(job: Job<IDataGatheringItem>) {
    try {
      const { dataSource, date, symbol } = job.data;

      const historicalData = await this.dataProviderService.getHistoricalRaw(
        [{ dataSource, symbol }],
        parseISO(<string>(<unknown>date)),
        new Date()
      );

      let currentDate = parseISO(<string>(<unknown>date));
      let lastMarketPrice: number;

      while (
        isBefore(
          currentDate,
          new Date(
            Date.UTC(
              getYear(new Date()),
              getMonth(new Date()),
              getDate(new Date()),
              0
            )
          )
        )
      ) {
        if (
          historicalData[symbol]?.[format(currentDate, DATE_FORMAT)]
            ?.marketPrice
        ) {
          lastMarketPrice =
            historicalData[symbol]?.[format(currentDate, DATE_FORMAT)]
              ?.marketPrice;
        }

        if (lastMarketPrice) {
          try {
            await this.marketDataService.updateMarketData({
              data: {
                marketPrice: lastMarketPrice,
                state: 'CLOSE'
              },
              where: {
                dataSource_date_symbol: {
                  dataSource,
                  symbol,
                  date: getStartOfUtcDate(currentDate)
                }
              }
            });
          } catch {}
        }

        // Count month one up for iteration
        currentDate = new Date(
          Date.UTC(
            getYear(currentDate),
            getMonth(currentDate),
            getDate(currentDate) + 1,
            0
          )
        );
      }

      Logger.log(
        `Historical market data gathering has been completed for ${symbol} (${dataSource}).`,
        `DataGatheringProcessor (${GATHER_HISTORICAL_MARKET_DATA_PROCESS})`
      );
    } catch (error) {
      Logger.error(
        error,
        `DataGatheringProcessor (${GATHER_HISTORICAL_MARKET_DATA_PROCESS})`
      );

      throw new Error(error);
    }
  }
}
