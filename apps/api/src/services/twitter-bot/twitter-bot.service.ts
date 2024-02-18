import { BenchmarkService } from '@ghostfolio/api/app/benchmark/benchmark.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  ghostfolioFearAndGreedIndexDataSource,
  ghostfolioFearAndGreedIndexSymbol
} from '@ghostfolio/common/config';
import {
  resolveFearAndGreedIndex,
  resolveMarketCondition
} from '@ghostfolio/common/helper';

import { Injectable, Logger } from '@nestjs/common';
import { isWeekend } from 'date-fns';
import { TwitterApi, TwitterApiReadWrite } from 'twitter-api-v2';

@Injectable()
export class TwitterBotService {
  private twitterClient: TwitterApiReadWrite;

  public constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly configurationService: ConfigurationService,
    private readonly symbolService: SymbolService
  ) {
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
          dataSource: ghostfolioFearAndGreedIndexDataSource,
          symbol: ghostfolioFearAndGreedIndexSymbol
        }
      });

      if (symbolItem?.marketPrice) {
        const { emoji, text } = resolveFearAndGreedIndex(
          symbolItem.marketPrice
        );

        let status = `Current market mood is ${emoji} ${text.toLowerCase()} (${
          symbolItem.marketPrice
        }/100)`;

        const benchmarkListing = await this.getBenchmarkListing();

        if (benchmarkListing?.length > 1) {
          status += '\n\n';
          status += '± from ATH in %\n';
          status += benchmarkListing;
        }

        const { data: createdTweet } =
          await this.twitterClient.v2.tweet(status);

        Logger.log(
          `Fear & Greed Index has been tweeted: https://twitter.com/ghostfolio_/status/${createdTweet.id}`,
          'TwitterBotService'
        );
      }
    } catch (error) {
      Logger.error(error, 'TwitterBotService');
    }
  }

  private async getBenchmarkListing() {
    const benchmarks = await this.benchmarkService.getBenchmarks({
      enableSharing: true,
      useCache: false
    });

    return benchmarks
      .map(({ marketCondition, name, performances }) => {
        return `${name} ${(
          performances.allTimeHigh.performancePercent * 100
        ).toFixed(1)}%${
          marketCondition !== 'NEUTRAL_MARKET'
            ? ' ' + resolveMarketCondition(marketCondition).emoji
            : ''
        }`;
      })
      .join('\n');
  }
}
