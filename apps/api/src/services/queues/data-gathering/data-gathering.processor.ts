import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { AssetProfileDelistedError } from '@ghostfolio/api/services/data-provider/errors/asset-profile-delisted.error';
import { DataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  DATA_GATHERING_QUEUE,
  DEFAULT_PROCESSOR_GATHER_ASSET_PROFILE_CONCURRENCY,
  DEFAULT_PROCESSOR_GATHER_HISTORICAL_MARKET_DATA_CONCURRENCY,
  GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
  GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME
} from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  getAssetProfileIdentifier,
  getStartOfUtcDate
} from '@ghostfolio/common/helper';
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
  private readonly logger = new Logger(DataGatheringProcessor.name);

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
    name: GATHER_ASSET_PROFILE_PROCESS_JOB_NAME
  })
  public async gatherAssetProfile(job: Job<AssetProfileIdentifier>) {
    const { dataSource, symbol } = job.data;

    try {
      this.logger.log(
        `Asset profile data gathering has been started for ${symbol} (${dataSource})`
      );

      await this.dataGatheringService.gatherAssetProfiles([job.data]);

      this.logger.log(
        `Asset profile data gathering has been completed for ${symbol} (${dataSource})`
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

        this.logger.log(
          `Asset profile data gathering has been discarded for ${symbol} (${dataSource})`
        );

        return job.discard();
      }

      this.logger.error(error);

      throw error;
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
  public async gatherHistoricalMarketData(job: Job<DataGatheringItem>) {
    const { dataSource, date, force, symbol } = job.data;

    try {
      let currentDate = parseISO(date as unknown as string);

      this.logger.log(
        `Historical market data gathering has been started for ${symbol} (${dataSource}) at ${format(
          currentDate,
          DATE_FORMAT
        )}${force ? ' (forced update)' : ''}`
      );

      const historicalData = await this.dataProviderService.getHistoricalRaw({
        assetProfileIdentifiers: [{ dataSource, symbol }],
        from: currentDate,
        to: new Date()
      });

      const assetProfileIdentifier = getAssetProfileIdentifier({
        dataSource,
        symbol
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
          historicalData[assetProfileIdentifier]?.[
            format(currentDate, DATE_FORMAT)
          ]?.marketPrice
        ) {
          lastMarketPrice =
            historicalData[assetProfileIdentifier]?.[
              format(currentDate, DATE_FORMAT)
            ]?.marketPrice;
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

      if (force) {
        await this.marketDataService.replaceForSymbol({
          data,
          dataSource,
          symbol
        });
      } else {
        await this.marketDataService.updateMany({ data });
      }

      this.logger.log(
        `Historical market data gathering has been completed for ${symbol} (${dataSource}) at ${format(
          currentDate,
          DATE_FORMAT
        )}`
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

        this.logger.log(
          `Historical market data gathering has been discarded for ${symbol} (${dataSource})`
        );

        return job.discard();
      }

      this.logger.error(error);

      throw error;
    }
  }
}
