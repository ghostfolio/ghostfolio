import { PortfolioPosition } from 'apps/api/src/app/portfolio/interfaces/portfolio-position.interface';
import { ExchangeRateDataService } from 'apps/api/src/services/exchange-rate-data.service';

import { Rule } from '../../rule';

export class PlatformClusterRiskSinglePlatform extends Rule {
  public constructor(public exchangeRateDataService: ExchangeRateDataService) {
    super(exchangeRateDataService, {
      name: 'Single Platform'
    });
  }

  public evaluate(positions: { [symbol: string]: PortfolioPosition }) {
    const platforms: string[] = [];

    Object.values(positions).forEach((position) => {
      for (const [platform] of Object.entries(position.platforms)) {
        if (!platforms.includes(platform)) {
          platforms.push(platform);
        }
      }
    });

    if (platforms.length === 1) {
      return {
        evaluation: `All your investment is managed by a single platform`,
        value: false
      };
    }

    return {
      evaluation: `Your investment is managed by ${platforms.length} platforms`,
      value: true
    };
  }
}
