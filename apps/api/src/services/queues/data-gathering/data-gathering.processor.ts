import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { AssetProfileDelistedError } from '@ghostfolio/api/services/data-provider/errors/asset-profile-delisted.error';
import {
  IDataGatheringItem,
  IDataProviderHistoricalResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  DATA_GATHERING_QUEUE,
  DEFAULT_PROCESSOR_GATHER_ASSET_PROFILE_CONCURRENCY,
  DEFAULT_PROCESSOR_GATHER_HISTORICAL_MARKET_DATA_CONCURRENCY,
  GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
  GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME,
  GATHER_MISSING_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME
} from '@ghostfolio/common/config';
import { DATE_FORMAT, getStartOfUtcDate } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Prisma } from '@prisma/client';
import { Job } from 'bull';
import { isNumber } from 'class-validator';
import {
  addDays,
  format,
  getDate,
  getMonth,
  getYear,
  isBefore,
  parseISO,
  eachDayOfInterval,
  isEqual
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
    name: GATHER_ASSET_PROFILE_PROCESS_JOB_NAME
  })
  public async gatherAssetProfile(job: Job<AssetProfileIdentifier>) {
    const { dataSource, symbol } = job.data;

    try {
      Logger.log(
        `Asset profile data gathering has been started for ${symbol} (${dataSource})`,
        `DataGatheringProcessor (${GATHER_ASSET_PROFILE_PROCESS_JOB_NAME})`
      );

      await this.dataGatheringService.gatherAssetProfiles([job.data]);

      Logger.log(
        `Asset profile data gathering has been completed for ${symbol} (${dataSource})`,
        `DataGatheringProcessor (${GATHER_ASSET_PROFILE_PROCESS_JOB_NAME})`
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

        Logger.log(
          `Asset profile data gathering has been discarded for ${symbol} (${dataSource})`,
          `DataGatheringProcessor (${GATHER_ASSET_PROFILE_PROCESS_JOB_NAME})`
        );

        return job.discard();
      }

      Logger.error(
        error,
        `DataGatheringProcessor (${GATHER_ASSET_PROFILE_PROCESS_JOB_NAME})`
      );

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

        Logger.log(
          `Historical market data gathering has been discarded for ${symbol} (${dataSource})`,
          `DataGatheringProcessor (${GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME})`
        );

        return job.discard();
      }

      Logger.error(
        error,
        `DataGatheringProcessor (${GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME})`
      );

      throw error;
    }
  }
  @Process({
    concurrency: parseInt(
      process.env.PROCESSOR_CONCURRENCY_GATHER_HISTORICAL_MARKET_DATA ??
        DEFAULT_PROCESSOR_GATHER_HISTORICAL_MARKET_DATA_CONCURRENCY.toString(),
      10
    ),
    name: GATHER_MISSING_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME
  })
  public async gatherMissingHistoricalMarketData(job: Job<IDataGatheringItem>) {
    try {
      const { dataSource, date, symbol } = job.data;

      Logger.log(
        `Historical market data gathering for missing values has been started for ${symbol} (${dataSource}) at ${format(
          date,
          DATE_FORMAT
        )}`,
        `DataGatheringProcessor (${GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME})`
      );
      const entries = await this.marketDataService.marketDataItems({
        where: {
          AND: {
            symbol: {
              equals: symbol
            },
            dataSource: {
              equals: dataSource
            }
          }
        },
        orderBy: {
          date: 'asc'
        },
        take: 1
      });
      const firstEntry = entries[0];
      const marketData = await this.marketDataService
        .getRange({
          assetProfileIdentifiers: [{ dataSource, symbol }],
          dateQuery: {
            gte: addDays(firstEntry.date, -10)
          }
        })
        .then((md) => md.map((m) => m.date));

      let dates = eachDayOfInterval(
        {
          start: firstEntry.date,
          end: new Date()
        },
        {
          step: 1
        }
      );
      dates = dates.filter((d) => !marketData.some((md) => isEqual(md, d)));

      const historicalData = await this.dataProviderService.getHistoricalRaw({
        assetProfileIdentifiers: [{ dataSource, symbol }],
        from: firstEntry.date,
        to: new Date()
      });

      const data: Prisma.MarketDataUpdateInput[] =
        this.mapToMarketUpsertDataInputs(
          dates,
          historicalData,
          symbol,
          dataSource
        );

      await this.marketDataService.updateMany({ data });

      Logger.log(
        `Historical market data gathering for missing values has been completed for ${symbol} (${dataSource}) at ${format(
          date,
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

        Logger.log(
          `Historical market data gathering has been discarded for ${symbol} (${dataSource})`,
          `DataGatheringProcessor (${GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME})`
        );

        return job.discard();
      }

      Logger.error(
        error,
        `DataGatheringProcessor (${GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME})`
      );

      throw error;
    }
  }

  private mapToMarketUpsertDataInputs(
    missingMarketData: Date[],
    historicalData: Record<
      string,
      Record<string, IDataProviderHistoricalResponse>
    >,
    symbol: string,
    dataSource: DataSource
  ): Prisma.MarketDataUpdateInput[] {
    return missingMarketData.map((date) => {
      if (
        isNumber(
          historicalData[symbol]?.[format(date, DATE_FORMAT)]?.marketPrice
        )
      ) {
        return {
          date,
          symbol,
          dataSource,
          marketPrice:
            historicalData[symbol]?.[format(date, DATE_FORMAT)]?.marketPrice
        };
      } else {
        let earlierDate = date;
        let index = 0;
        while (
          !isNumber(
            historicalData[symbol]?.[format(earlierDate, DATE_FORMAT)]
              ?.marketPrice
          )
        ) {
          earlierDate = addDays(earlierDate, -1);
          index++;
          if (index > 10) {
            break;
          }
        }
        if (
          isNumber(
            historicalData[symbol]?.[format(earlierDate, DATE_FORMAT)]
              ?.marketPrice
          )
        ) {
          return {
            date,
            symbol,
            dataSource,
            marketPrice:
              historicalData[symbol]?.[format(earlierDate, DATE_FORMAT)]
                ?.marketPrice
          };
        }
      }
    });
  }
}
