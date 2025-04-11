import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { AssetProfileDelistedError } from '@ghostfolio/api/services/data-provider/errors/asset-profile-delisted.error';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  DATA_GATHERING_QUEUE,
  DEFAULT_PROCESSOR_GATHER_ASSET_PROFILE_CONCURRENCY,
  DEFAULT_PROCESSOR_GATHER_HISTORICAL_MARKET_DATA_CONCURRENCY,
  GATHER_ASSET_PROFILE_PROCESS,
  GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME
} from '@ghostfolio/common/config';
import { DATE_FORMAT, getStartOfUtcDate } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job } from 'bull';
import {
  addDays,
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
    private readonly marketDataService: MarketDataService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  @Process({
    concurrency: parseInt(
      process.env.PROCESSOR_GATHER_ASSET_PROFILE_CONCURRENCY ??
        DEFAULT_PROCESSOR_GATHER_ASSET_PROFILE_CONCURRENCY.toString(),
      10
    ),
    name: GATHER_ASSET_PROFILE_PROCESS
  })
  public async gatherAssetProfile(job: Job<AssetProfileIdentifier>) {
    try {
      Logger.log(
        `Asset profile data gathering has been started for ${job.data.symbol} (${job.data.dataSource})`,
        `DataGatheringProcessor (${GATHER_ASSET_PROFILE_PROCESS})`
      );

      await this.dataGatheringService.gatherAssetProfiles([job.data]);

      Logger.log(
        `Asset profile data gathering has been completed for ${job.data.symbol} (${job.data.dataSource})`,
        `DataGatheringProcessor (${GATHER_ASSET_PROFILE_PROCESS})`
      );
    } catch (error) {
      Logger.error(
        error,
        `DataGatheringProcessor (${GATHER_ASSET_PROFILE_PROCESS})`
      );

      throw new Error(error);
    }
  }

  @Process({
    concurrency: parseInt(
      process.env.PROCESSOR_GATHER_HISTORICAL_MARKET_DATA_CONCURRENCY ??
        DEFAULT_PROCESSOR_GATHER_HISTORICAL_MARKET_DATA_CONCURRENCY.toString(),
      10
    ),
    name: GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME
  })
  public async gatherHistoricalMarketData(job: Job<IDataGatheringItem>) {
    const { dataSource, date, symbol } = job.data;

    try {
      let currentDate = parseISO(date as unknown as string);

      Logger.log(
        `Historical market data gathering has been started for ${symbol} (${dataSource}) at ${format(
          currentDate,
          DATE_FORMAT
        )}`,
        `DataGatheringProcessor (${GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME})`
      );

      const historicalData = await this.dataProviderService.getHistoricalRaw({
        assetProfileIdentifiers: [{ dataSource, symbol }],
        from: currentDate,
        to: new Date()
      });

      const data: Prisma.MarketDataUpdateInput[] = [];
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
          data.push({
            dataSource,
            symbol,
            date: getStartOfUtcDate(currentDate),
            marketPrice: lastMarketPrice,
            state: 'CLOSE'
          });
        }

        currentDate = addDays(currentDate, 1);
      }

      await this.marketDataService.updateMany({ data });

      Logger.log(
        `Historical market data gathering has been completed for ${symbol} (${dataSource}) at ${format(
          currentDate,
          DATE_FORMAT
        )}`,
        `DataGatheringProcessor (${GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME})`
      );
    } catch (error) {
      if (error instanceof AssetProfileDelistedError) {
        await this.symbolProfileService.updateSymbolProfile(
          {
            dataSource,
            symbol
          },
          {
            isActive: false
          }
        );

        await job.discard();
      }

      Logger.error(
        error,
        `DataGatheringProcessor (${GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME})`
      );

      throw error;
    }
  }
}
