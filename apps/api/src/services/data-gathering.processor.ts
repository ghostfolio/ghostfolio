import {
  DATA_GATHERING_QUEUE,
  GATHER_ASSET_PROFILE_PROCESS,
  GATHER_HISTORICAL_MARKET_DATA_PROCESS
} from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
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
import { DataProviderService } from './data-provider/data-provider.service';
import { IDataGatheringItem } from './interfaces/interfaces';
import { PrismaService } from './prisma.service';

@Injectable()
@Processor(DATA_GATHERING_QUEUE)
export class DataGatheringProcessor {
  public constructor(
    private readonly dataGatheringService: DataGatheringService,
    private readonly dataProviderService: DataProviderService,
    private readonly prismaService: PrismaService
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
            await this.prismaService.marketData.create({
              data: {
                dataSource,
                symbol,
                date: new Date(
                  Date.UTC(
                    getYear(currentDate),
                    getMonth(currentDate),
                    getDate(currentDate),
                    0
                  )
                ),
                marketPrice: lastMarketPrice
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
