import { BenchmarkService } from '@ghostfolio/api/app/benchmark/benchmark.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_BENCHMARKS,
  ghostfolioFearAndGreedIndexDataSource,
  ghostfolioFearAndGreedIndexSymbol
} from '@ghostfolio/common/config';
import {
  resolveFearAndGreedIndex,
  resolveMarketCondition
} from '@ghostfolio/common/helper';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import { Injectable, Logger } from '@nestjs/common';
import { isWeekend } from 'date-fns';
import * as roundTo from 'round-to';
import { TwitterApi, TwitterApiReadWrite } from 'twitter-api-v2';

@Injectable()
export class TwitterBotService {
  private twitterClient: TwitterApiReadWrite;

  public constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly configurationService: ConfigurationService,
    private readonly propertyService: PropertyService,
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

        let status = `Current Market Mood: ${emoji} ${text} (${symbolItem.marketPrice}/100)`;

        const benchmarkListing = await this.getBenchmarkListing(3);

        if (benchmarkListing?.length > 1) {
          status += '\n\n';
          status += '±% from ATH\n';
          status += benchmarkListing;
        }

        const { data: createdTweet } = await this.twitterClient.v2.tweet(
          status
        );

        Logger.log(
          `Fear & Greed Index has been tweeted: https://twitter.com/ghostfolio_/status/${createdTweet.id}`,
          'TwitterBotService'
        );
      }
    } catch (error) {
      Logger.error(error, 'TwitterBotService');
    }
  }

  private async getBenchmarkListing(aMax: number) {
    const benchmarkAssets: UniqueAsset[] =
      ((await this.propertyService.getByKey(
        PROPERTY_BENCHMARKS
      )) as UniqueAsset[]) ?? [];

    const benchmarks = await this.benchmarkService.getBenchmarks(
      benchmarkAssets
    );

    const benchmarkListing: string[] = [];

    for (const [index, benchmark] of benchmarks.entries()) {
      if (index > aMax - 1) {
        break;
      }

      benchmarkListing.push(
        `${benchmark.name} ${roundTo(
          benchmark.performances.allTimeHigh.performancePercent * 100,
          1
        )}%${
          benchmark.marketCondition !== 'NEUTRAL_MARKET'
            ? ' ' + resolveMarketCondition(benchmark.marketCondition).emoji
            : ''
        }`
      );
    }

    return benchmarkListing.join('\n');
  }
}
