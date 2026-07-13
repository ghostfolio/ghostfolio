import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ghostfolioFearAndGreedIndexSymbolStocks } from '@ghostfolio/common/config';
import {
  resolveFearAndGreedIndex,
  resolveMarketCondition
} from '@ghostfolio/common/helper';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { isWeekend } from 'date-fns';
import { round } from 'lodash';
import { TwitterApi, TwitterApiReadWrite } from 'twitter-api-v2';

@Injectable()
export class TwitterBotService implements OnModuleInit {
  private readonly logger = new Logger(TwitterBotService.name);

  private twitterClient: TwitterApiReadWrite;

  public constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly configurationService: ConfigurationService,
    private readonly dataProviderService: DataProviderService,
    private readonly symbolService: SymbolService
  ) {}

  public onModuleInit() {
    this.twitterClient = new TwitterApi({
      accessSecret: this.configurationService.get(
        'TWITTER_ACCESS_TOKEN_SECRET'
      ),
      accessToken: this.configurationService.get('TWITTER_ACCESS_TOKEN'),
      appKey: this.configurationService.get('TWITTER_API_KEY'),
      appSecret: this.configurationService.get('TWITTER_API_SECRET')
    }).readWrite;
  }

  public async tweetFearAndGreedIndex() {
    if (
      !this.configurationService.get('ENABLE_FEATURE_FEAR_AND_GREED_INDEX') ||
      isWeekend(new Date())
    ) {
      return;
    }

    try {
      const symbolItem = await this.symbolService.get({
        dataGatheringItem: {
          dataSource:
            this.dataProviderService.getDataSourceForFearAndGreedIndexStocks(),
          symbol: ghostfolioFearAndGreedIndexSymbolStocks
        }
      });

      if (symbolItem?.marketPrice) {
        const { emoji, text } = resolveFearAndGreedIndex(
          symbolItem.marketPrice
        );

        let status = `Current market mood is ${emoji} ${text.toLowerCase()} (${round(
          symbolItem.marketPrice
        )}/100)`;

        const benchmarkListing = await this.getBenchmarkListing();

        if (benchmarkListing?.length > 1) {
          status += '\n\n';
          status += '± from ATH in %\n';
          status += benchmarkListing;
        }

        const { data: createdTweet } =
          await this.twitterClient.v2.tweet(status);

        this.logger.log(
          `Fear & Greed Index has been posted: https://x.com/ghostfolio_/status/${createdTweet.id}`
        );
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async getBenchmarkListing() {
    const benchmarks = await this.benchmarkService.getBenchmarks({
      enableSharing: true,
      useCache: false
    });

    return benchmarks
      .map(({ name, performances }) => {
        const performancePercent = round(
          performances.allTimeHigh.performancePercent,
          3
        );

        const marketCondition =
          this.benchmarkService.getMarketCondition(performancePercent);

        return `${name} ${(performancePercent * 100).toFixed(1)}%${
          marketCondition !== 'NEUTRAL_MARKET'
            ? ' ' + resolveMarketCondition(marketCondition).emoji
            : ''
        }`;
      })
      .join('\n');
  }
}
